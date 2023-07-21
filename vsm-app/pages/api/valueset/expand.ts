import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient, terminologyClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import cloneDeep from 'lodash.clonedeep'

interface FindMatches {
  vs: fhir4.ValueSet
  codeToFind: string
  systemToFind: string | null
}

interface GrouperIdsByUrlItem {
  version?: string
  grouperIds?: Set<string>
}

type GrouperIdsByUrl = Record<string, GrouperIdsByUrlItem>

const matchingCodeGroups = ({ vs, codeToFind, systemToFind }: FindMatches): boolean => {
  if (!systemToFind) return Boolean(vs?.expansion?.contains?.find(i => i?.code?.toLowerCase() === codeToFind?.toLowerCase()))
  return Boolean(vs?.expansion?.contains?.find(i => i?.code?.toLowerCase() === codeToFind?.toLowerCase() && i?.system?.toLowerCase() === systemToFind?.toLowerCase()))
}

const findMatches = ({ vs, codeToFind, systemToFind }: FindMatches): boolean => {
  if (!systemToFind) {
    const match = vs?.expansion?.contains?.find(i => i?.code?.toLowerCase() === codeToFind?.toLowerCase())
    return ({
      isMatch: Boolean(match),
      codeMatches: match
    })
  } else {
    const match = vs?.expansion?.contains?.find(i => i?.code?.toLowerCase() === codeToFind?.toLowerCase() && i?.system?.toLowerCase() === systemToFind?.toLowerCase())
    return ({
      isMatch: Boolean(match),
      codeMatches: match
    })
  }
}

// perhaps simplify the requests by using the data that's in the FE for the table?
const expandValueSets = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const systems = Object.keys(req.body.expansionParameters)

    const parameter = [] as fhir4.ParametersParameter[]
    systems.forEach((system) => {
      const systemVersions: string[] = req.body.expansionParameters[system]
      const addToParameter = systemVersions.map((version: string) => ({
        name: 'system-version',
        valueCanonical: `${system}|${version}`
      }))
      parameter.push(...addToParameter)
    })

    const parameters = {
      resourceType: 'Parameters',
      parameter
    } as fhir4.Parameters

    let response
    const groupersToSearch = req?.body?.groupersToSearch as string[] | undefined

    // in this case expanding just one valueset
    if (typeof req.body.valueSetId === 'string') {
      response = await vsacFhirClient.operation({
        name: '$expand',
        id: req.body.valueSetId,
        resourceType: 'ValueSet',
        method: 'POST',
        input: JSON.stringify(parameters),
        options: {
          headers: {
            'content-type': 'application/json'
          }
        }
      })
    } else if (groupersToSearch) {
      const systemToFind = req?.body?.codeSystem
      const codeToFind = req?.body?.codeToFind
      
      // only get leafs from groupers indicated
      const findMatchingVsetUrls = async () => {
        const getSpecifiedGroupers = async () => {
          const batchEntries: fhir4.BundleEntry[] = groupersToSearch.map((grouperId) => {
            return {
              request: {
                method: 'GET',
                resourceType: 'ValueSet',
                // why doesn't _elements work here?
                url: `ValueSet?_id=${grouperId}&_elements=id`
              }
            }
          })

          const grouperRequestBundle: fhir4.Bundle & { type: 'batch' } = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: batchEntries
          }

          const allGroupers = await fhirCdrClient.batch({
            body: grouperRequestBundle
          })

          return allGroupers?.entry?.map(i => i?.resource?.entry?.[0]?.resource).filter(x => x) || []
        }

        const arrangeGroupersByLeafRef = (groupers: fhir4.ValueSet[]) => {
          const grouperIdsByLeafRef: GrouperIdsByUrl = {}
          for (const grouper of groupers) {
              // exclude groupers that don't have anything in compose.include (bad data?)
              if(!grouper?.compose?.include?.length) return
              const vsRefs = grouper?.compose?.include?.map(i => i?.valueSet?.[0])?.filter(x => Boolean(x))

              vsRefs.forEach((ref: string) => {
                const [url, version] = ref.split('|')
                const grouperIds = grouperIdsByLeafRef?.[url]?.grouperIds
                if (typeof grouperIds !== undefined && Array.isArray(grouperIds)) {
                  grouperIdsByLeafRef[url].grouperIds = new Set([...grouperIdsByLeafRef[url].grouperIds, grouper.id])
                } else {
                  grouperIdsByLeafRef[url] = new Set([])
                  grouperIdsByLeafRef[url].grouperIds = new Set([grouper.id])
                }
                grouperIdsByLeafRef[url].version = version
              })
          }
          return grouperIdsByLeafRef
        }

        const matchingLeafs = async (groupersByLeaf: GrouperIdsByUrl | undefined) => {
          const clonedGroupersByLeaf = cloneDeep(groupersByLeaf)

          const leafUrls = Object.keys(clonedGroupersByLeaf)

          // needs to check the RIGHT VERSION of a leaf valueset
          const batchEntries: fhir4.BundleEntry[] = leafUrls.map((leafUrl) => {
            let searchUrl = `/ValueSet?url=${leafUrl}&_sort=version`
            const leafVersion = groupersByLeaf[leafUrl].version

            if (leafVersion) {
              searchUrl += `&version=${leafVersion}`
            }

            return {
              request: {
                method: 'GET',
                resourceType: 'ValueSet',
                url: searchUrl
              }
            }
          })

          const leafRequestBundle: fhir4.Bundle & { type: 'batch' } = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: batchEntries
          }

          // need to get the leafs from CQF in order to have enough information to get them from the proper terminology server
          const allLeafs = await fhirCdrClient.batch({
            body: leafRequestBundle
          })

          // is this flattening desirable? does it hide that multiple same vsets might exist? need to check
          const leafsFromCQF = allLeafs.entry?.map(i => i?.resource?.entry)?.flat()?.map((x: any) => x?.resource)?.filter((y: any) => Boolean(y))

          // now, you have the leafs from the CQF server, but we need the proper ID in order to $expand from the terminology server
          const vsacEntries = leafsFromCQF.map((leafVs: fhir4.ValueSet) => {
            // we strip VSAC-specific appended version from URL before saving
            const leafUrl = leafVs.url!
            let searchUrl = `/ValueSet?url=${leafVs.url}&_sort=version`
            const leafVersion = groupersByLeaf[leafUrl].version

            if (leafVersion) {
              searchUrl += `&version=${leafVersion}`
            }

            return {
              request: {
                method: 'GET',
                resourceType: 'ValueSet',
                url: searchUrl
              }
            }
          })

          const vsacLeafRequestBundle: fhir4.Bundle & { type: 'batch' } = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: vsacEntries
          }

          // need to get the leafs from CQF in order to have enough information to get them from the proper terminology server
          const vsacLeafBundle = await vsacFhirClient.batch({
            body: vsacLeafRequestBundle
          })

          console.log('bundle.entry: ', vsacLeafBundle.entry)
          
          const allVsacLeafs = vsacLeafBundle?.entry
            ?.filter(i => i?.resource?.entry)
            ?.map(i => i?.resource?.entry?.[0]?.resource)

          const matchingExpansions = async () => {
            const expansions = await Promise.allSettled(
              allVsacLeafs.map((leaf: fhir4.ValueSet) => (
                vsacFhirClient.operation({
                  name: '$expand',
                  id: leaf.id,
                  resourceType: 'ValueSet',
                  method: 'POST',
                  input: JSON.stringify(parameters),
                  options: {
                    headers: {
                      'content-type': 'application/json'
                    }
                  }
                })
              ))
            )
            
            // filter out undefined results (maybe better error handling eventually)
            // how to handle these Promise types?
            const expandedItems = expansions?.map((promiseItem) => promiseItem?.value)?.filter(x => x.resourceType === 'ValueSet')

            // only want valuesets that contain the code + (optional) system
            const matches = expandedItems?.filter((vs: fhir4.ValueSet) => {
              return findMatches({ vs, codeToFind, systemToFind }).isMatch
            })
            console.log('matches: ', matches)
            console.log('grouper ids by leaf: ', grouperIdsByLeaf)
            // return the urls of valuesets that contain the code
            return matches?.map(i => ({
              leafDisplay: i?.name,
              url: i?.url?.split('-')?.[0],
              matchingCodes: findMatches({ vs: i, codeToFind, systemToFind }).codeMatches,
              // grouperIds: grouperIdsByLeaf[i?.url?.split('-')?.[0]].grouperIds
            }))
          }

          const matchingVSets = await matchingExpansions()
          return matchingVSets
        }

        const allGroupers = await getSpecifiedGroupers()
        const grouperIdsByLeaf = arrangeGroupersByLeafRef(allGroupers)
        const matchingValueSetUrlsAndCodes = await matchingLeafs(grouperIdsByLeaf)

        // const unversionedUrls = matchingValueSetUrlsAndCodes?.map((vsUrl: string) => {
        //   // do not want the version, only the base url. VSAC tags on version to end of url
        //   const [url] = vsUrl.split('-')
        //   return url
        // })

        return matchingValueSetUrlsAndCodes
      }

      const matchingVsUrlsCodes = await findMatchingVsetUrls()
      res.status(200).send(matchingVsUrlsCodes)

    } else {
      console.log("oops")
      return res.status(500).json({ error: 'Invalid request.' })
    }

    res.status(200).send(response)
  } catch (e: any) {
    logger.error('error in expandValueSets:  ', JSON.stringify(e, null, 2))
    res.status(404).json({ error: 'No results for expansion parameters.' })
  }
}

export default handler({
  POST: {
    action: expandValueSets,
    access: ['admin', 'editor']
  }
})
