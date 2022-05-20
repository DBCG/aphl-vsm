// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import FhirKitClient from 'fhir-kit-client'
import { fhirCdrClient } from 'fhirClients'
import NodeCache from 'node-cache'
import { is } from '@/helpers/is'

// Items in the table
interface Group {
  id: string
  title: string,
  url: string
}

interface ValueSetTableEntry {
  title: string
  canonical: string
  version: string
  groups: Group[]
}

// TODO - replace with redis and make sure we stay under 20 requests per second
// see: https://www.nlm.nih.gov/vsac/support/usingvsac/vsacsvsapiv2.html (Terms of Service)
const cache = new NodeCache()

const fetchProgram = (id: string) => {
  return fhirCdrClient.read({ resourceType: 'Library', id })
}

const fetchConditionsVS = (canonical: string) => {
  const id = canonical?.split('/')?.slice(-1)?.[0]
  return fhirCdrClient.read({ resourceType: 'ValueSet', id })
}

const fetchByCanonical = (client: FhirKitClient, resourceType: string, canonical: string) => {
  const cachedCopy = cache.get(canonical)
  if (cachedCopy) { return cachedCopy }

  const [url, version] = canonical.split('|')
  const searchParams: Record<string, string> = { url }
  if (version) { searchParams.version = version }
  const result = client.search({ resourceType, searchParams })
  cache.set(canonical, result)

  return result
}

const fetchGrouperLibrary = (canonical: string) => {
  return fetchByCanonical(fhirCdrClient, 'Library', canonical)
}

const fetchGrouperValueSets = (canonicals: string[]) => {
  return Promise.all(canonicals.map(canonical => fetchByCanonical(fhirCdrClient, 'ValueSet', canonical)))
}

// The leaf valueSets will eventually come from a maintained cache... for now, just grabbing from the fhir server
const fetchLeafValueSets = async (canonicals: string[], nameStr: string | undefined) => {
  const searchParams = is.string(nameStr) ? { 'name:contains': nameStr } : {}
  const result = await Promise.all(canonicals.map(canonical =>
  (fhirCdrClient.search({
    resourceType: 'ValueSet',
    // @ts-expect-error
    searchParams: {
      url: canonical,
      ...searchParams
    }
  }))
  ))

  // add canonical url to the valueset
  return result?.[0]?.entry?.map((e: fhir4.BundleEntry) => {
    const fullUrl = e?.fullUrl
    const resource = e?.resource
    if (fullUrl && resource) {
      return ({
        url: fullUrl,
        ...resource
      })
    }
  })
}

const isDefinedString = (item: any): item is string => {
  return !!item
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  const groupsByValueSetCanonical: Record<string, Group[]> = {}

  if (req.method === 'GET') {
    let leafValueSets: fhir4.ValueSet[] = []
    let allGrouperVSets: fhir4.ValueSet[] | [] = []

    try {
      const program = await fetchProgram(req.query.id as string)
      const conditionsVS = await fetchConditionsVS(process.env.CONDITIONS_CANONICAL as string)

      if (is.library(program)) {
        // get the grouper canonial
        // the program only has 2 relatedArtifacts: a Library and a PlanDefinition
        const grouperLibraryCanonical = program.relatedArtifact
          ?.find(related => related.resource?.includes('/Library/'))
          ?.resource

        if (grouperLibraryCanonical) {
          const grouperSearchResult = await fetchGrouperLibrary(grouperLibraryCanonical)
          // get all grouperValueSet canonicals
          if (is.bundle(grouperSearchResult) && is.library(grouperSearchResult?.entry?.[0]?.resource)) {
            const grouper = grouperSearchResult?.entry?.[0]?.resource as fhir4.Library

            const grouperValueSetCanonicals = grouper.relatedArtifact
              ?.filter(a => a.type == 'composed-of')
              .map(res => res.resource)
              .filter(isDefinedString)
            if (grouperValueSetCanonicals) {
              allGrouperVSets = (await fetchGrouperValueSets(grouperValueSetCanonicals))
                .filter(is.bundle)
                .flatMap(bundle => bundle.entry?.map(e => e.resource))
                .filter(is.valueSet)
              console.log('all are: ', allGrouperVSets)

              const leafValueSetResult = await Promise.all(allGrouperVSets.map(grouperVs => {
                const groupTitle = grouperVs?.title || ''
                const leafUrls = grouperVs?.compose?.include?.[0]?.valueSet

                // add groups to the leaf URLs
                leafUrls?.forEach(url => {
                  const groupToAdd = {
                    id: grouperVs.id || 'Undefined',
                    url: grouperVs.url || 'Undefined',
                    title: groupTitle
                  }
                  if (groupsByValueSetCanonical[url]) {
                    groupsByValueSetCanonical[url].push(groupToAdd)
                  } else {
                    groupsByValueSetCanonical[url] = [groupToAdd]
                  }
                })

                if (leafUrls) {
                  const stringToFind = req.query.findInVsName as string | undefined
                  return fetchLeafValueSets(leafUrls, stringToFind)
                }
              }))
              leafValueSets = leafValueSetResult.flat(2).filter(is.valueSet)
            }
          }
        }
      }

      const response: ValueSetTableEntry[] = leafValueSets.map(valueSet => {
        // condition VS is static, in our CDR
        // only snomed for now, but is an array of code sets by system
        const conceptCodesFromConditionVS: fhir4.ValueSetComposeInclude | undefined = conditionsVS?.compose?.include

        // leaf valuesets come from VSAC currently, will come from cache
        const conceptsFromLeaf = valueSet?.compose?.include

        let sharedCodes: fhir4.ValueSetComposeIncludeConcept[] = []

        // loop through all of the concept code sets from the valueSet
        // if the systems match and the code is in the RCKMS valueset, push to the shared arr
        conceptsFromLeaf?.forEach(codeSet => {
          const currentLeafCodeSystem = codeSet?.system
          let matchingSystemBlock: fhir4.ValueSetComposeInclude | undefined
          if (Array.isArray(conceptCodesFromConditionVS)) {
            matchingSystemBlock = conceptCodesFromConditionVS?.find(set => set?.system === currentLeafCodeSystem)
          }
          if (matchingSystemBlock) {
            codeSet?.concept?.forEach(concept => {
              const codeToSearch = concept?.code
              const foundCodeInRCKMS: fhir4.ValueSetComposeIncludeConcept | undefined = matchingSystemBlock?.concept?.find(obj => obj?.code === codeToSearch)
              if (foundCodeInRCKMS) {
                sharedCodes?.push(foundCodeInRCKMS)
              }
            })
          }
        })

        const leafVsCanonical = Object?.keys(groupsByValueSetCanonical)?.find(k => k?.endsWith(valueSet?.id as string))

        const groupsVsBelongsTo = groupsByValueSetCanonical[leafVsCanonical || 'Undefined']

        let result = {
          programName: program?.name || 'Undefined',
          programId: program?.id || 'Undefined',
          title: valueSet.name || 'Undefined',
          canonical: valueSet.url || 'Undefined',
          version: valueSet.version || '',
          conditions: sharedCodes || [],
          groups: groupsVsBelongsTo
        }

        const groupCanonicalsToFilterBy = req?.query?.groups?.split(',')

        const valueSetInAllowedGroup = () => {
          // if no group filters active, valueset is allowed
          if (!groupCanonicalsToFilterBy) return true
          // if only one filter selected, it must match
          if (groupCanonicalsToFilterBy?.length === 1) {
            // do the vs groups include the filtered group
            return !!groupsVsBelongsTo?.find(g => groupCanonicalsToFilterBy.includes(g?.url))
          }
          // if there are more than 1 group, the valuesets must match ALL active group filters
          return groupCanonicalsToFilterBy?.every((canonical: string) => groupsVsBelongsTo?.find(g => g?.url === canonical))
        }

        if (valueSetInAllowedGroup()) {
          return result
        }
      }).filter(x => x)

      const composedResponse = {
        data: response,
        groupsInProgram: allGrouperVSets
      }

      console.log('composedResponse: ', composedResponse)

      res.status(200).send(composedResponse)

    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for leaf valueset details failed.' })
    }
  }
}
