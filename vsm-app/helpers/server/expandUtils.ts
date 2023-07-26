import FhirKitClient from 'fhir-kit-client'
import cloneDeep from 'lodash.clonedeep'
import { is } from '../is'

interface GrouperIdsByUrlItem {
  version?: string
  grouperIds?: Set<string>
}

type GrouperIdsByUrl = Record<string, GrouperIdsByUrlItem>

interface BuildUrlParams {
  leafUrl: string
  leafVersion: string | undefined
}

const buildSearchUrl = ({ leafUrl, leafVersion }: BuildUrlParams) => (
  `/ValueSet?url=${leafUrl}&_sort=version` + (leafVersion ? `&version=${leafVersion}` : '')
)

interface FindMatches {
  vs: fhir4.ValueSet
  codeToFind: string
  systemToFind: string | null
}

interface MatchResult {
  isMatch: Boolean
  codeMatches: fhir4.ValueSetExpansionContains | undefined
}

const findMatches = ({ vs, codeToFind, systemToFind }: FindMatches): MatchResult => {
  const match = !systemToFind
    ? vs?.expansion?.contains?.find(i => i?.code?.toLowerCase() === codeToFind?.toLowerCase())
    : vs?.expansion?.contains?.find(
      i => i?.code?.toLowerCase() === codeToFind?.toLowerCase() && i?.system?.toLowerCase() === systemToFind?.toLowerCase()
    )
  return ({
    isMatch: Boolean(match),
    codeMatches: match
  })
}

const getSpecifiedGroupers = async (groupersToSearch: string[], fhirCdrClient: FhirKitClient) => {
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

  // using <any> here, fhir types doesn't seem to map the {resource, response} obj structure for a bundle response
  const result = allGroupers?.entry?.map((i: any) => i?.resource?.entry?.[0]?.resource).filter((x: any) => x) || []
  console.log('result: ', result)
  return result
}

const arrangeGroupersByLeafRef = (groupers: fhir4.ValueSet[]) => {
  const grouperIdsByLeafRef: GrouperIdsByUrl = {}
  for (const grouper of groupers) {
      // exclude groupers that don't have anything in compose.include (bad data?)
      if(!grouper?.compose?.include?.length) return
      console.log('grouper.compose.include: ', grouper?.compose?.include)
      const vsRefs = grouper?.compose?.include?.map(i => i?.valueSet?.[0])?.filter(x => Boolean(x)) as string[]

      vsRefs.forEach((ref: string, ind) => {
        const [url, version] = ref.split('|')
        const existingGrouperIds = grouperIdsByLeafRef?.[url]?.grouperIds

        if (typeof existingGrouperIds !== 'undefined' && existingGrouperIds.size) {
          grouperIdsByLeafRef[url].grouperIds = new Set([...existingGrouperIds, grouper.id])
        } else {
          console.log('this called')
          grouperIdsByLeafRef[url] = new Set([]) as GrouperIdsByUrlItem
          grouperIdsByLeafRef[url].grouperIds = new Set([grouper.id!])
        }
        grouperIdsByLeafRef[url].version = version
      })
  }
  return grouperIdsByLeafRef
}

interface FindMatchingVsetUrlsParams {
  fhirCdrClient: FhirKitClient
  vsacFhirClient: FhirKitClient
  parameters:   fhir4.Parameters
  codeToFind: string
  systemToFind: string | null
  groupersToSearch: string[]
}

// only get leafs from groupers indicated
const findMatchingVsetUrls = async ({
  fhirCdrClient,
  vsacFhirClient,
  parameters,
  codeToFind,
  systemToFind,
  groupersToSearch
}: FindMatchingVsetUrlsParams) => {

  const matchingLeafs = async (groupersByLeaf: GrouperIdsByUrl | undefined) => {
    if (!groupersByLeaf) return []

    const clonedGroupersByLeaf = cloneDeep(groupersByLeaf)

    const leafUrls = Object?.keys(clonedGroupersByLeaf) || []

    // needs to check the RIGHT VERSION of a leaf valueset
    const batchEntries: fhir4.BundleEntry[] = leafUrls.map((leafUrl) => {
      const leafVersion = groupersByLeaf?.[leafUrl]?.version
      const searchUrl = buildSearchUrl({ leafUrl, leafVersion })

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
    const leafsFromCQF = allLeafs.entry?.map((i: any) => i?.resource?.entry)?.flat()?.map((x: any) => x?.resource)?.filter((y: any) => Boolean(y))

    // now, you have the leafs from the CQF server, but we need the proper ID in order to $expand from the terminology server
    const vsacEntries = leafsFromCQF.map((leafVs: fhir4.ValueSet) => {
      // we strip VSAC-specific appended version from URL before saving
      const leafUrl = leafVs.url!
      const leafVersion = groupersByLeaf?.[leafUrl]?.version
      const searchUrl = buildSearchUrl({ leafUrl: leafVs.url!, leafVersion })

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
    
    const allVsacLeafs = vsacLeafBundle?.entry
      ?.filter((i: any) => i?.resource?.entry)
      ?.map((i: any) => i?.resource?.entry?.[0]?.resource)
      ?.filter((x: any) => Boolean(x)) as fhir4.ValueSet[]

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
      const expandedItems = expansions
        ?.filter((promiseItem) => is.promiseFulfilled(promiseItem))
        ?.map((res: any) => res.value) as fhir4.ValueSet[]

      // only want valuesets that contain the code + (optional) system
      const matches = expandedItems?.filter((vs: fhir4.ValueSet) => {
        return findMatches({ vs, codeToFind, systemToFind }).isMatch
      })

      console.log('groupers by leaf: ', groupersByLeaf)
      // return the urls of valuesets that contain the code
      return matches?.map(i => {
        const vsUrl = i?.url?.split('-')?.[0] as string
        console.log('vs url: ', vsUrl)
        const grouperInfo = Array.from(groupersByLeaf?.[vsUrl]?.grouperIds || [])
        return ({
        leafDisplay: i?.name,
        groupersBelongsTo: grouperInfo,
        url: vsUrl,
        matchingCodes: findMatches({ vs: i, codeToFind, systemToFind }).codeMatches,
      })
    }
      )
    }

    const matchingVSets = await matchingExpansions()
    return matchingVSets
  }

  const allGroupers = await getSpecifiedGroupers(groupersToSearch, fhirCdrClient)
  const grouperIdsByLeaf = arrangeGroupersByLeafRef(allGroupers)
  const matchingValueSetUrlsAndCodes = await matchingLeafs(grouperIdsByLeaf)

  return matchingValueSetUrlsAndCodes
}

export {
  buildSearchUrl,
  findMatches,
  getSpecifiedGroupers,
  arrangeGroupersByLeafRef,
  findMatchingVsetUrls
}