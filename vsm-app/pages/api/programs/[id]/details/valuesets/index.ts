// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import FhirKitClient from 'fhir-kit-client'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import NodeCache from 'node-cache'
import { is } from '@/helpers/is'

// FAKE mode
const fakeMode = false
import * as fixture from './fixture.json'
// FAKE mode


// Items in the table
interface Group {
  id: string
  title: string
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

// These are from FHIR client (array of FHIR Bundle resources)
const fetchLeafValueSets = async (canonicals: string[], nameStr: string | undefined) => {
  // TODO: This only uses the first one so we don't overwhelm
  const tempCanonicals = canonicals
  const searchParams = is.string(nameStr) ? { 'name:contains': nameStr } : {}
  const result = await Promise.all(tempCanonicals.map(canonical =>
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

  if (fakeMode) {
    res.status(200).send((fixture as any).default)
    return
  }

  const groupsByValueSetCanonical: Record<string, Group[]> = {}

  if (req.method === 'GET') {
    let leafValueSets: fhir4.ValueSet[] = []

    try {
      const program = await fetchProgram(req.query.id as string)
      const conditionsVS = await fetchConditionsVS(process.env.CONDITIONS_CANONICAL as string)
      let grouperVSets: fhir4.ValueSet[] | [] = []

      const allowedGrouper = (canonicalToSearch: string): boolean => {
        if (typeof req.query.groups === 'string' && req.query.groups !== '') {
          const splitGroups = req?.query?.groups?.split(',')
          return splitGroups?.includes(canonicalToSearch)
        }
        return true
      }

      // TODO
      const allowedCondition = (valueSet: fhir4.ValueSet): boolean => {
        if (typeof req.query.conditions === 'string' && req.query.groups !== '') {
          // convert string from query back to an object
          const conditions = JSON.parse(decodeURIComponent(req.query.conditions))
          conditions?.forEach(condition => {
            // if the valueset does not contain the conditions in useContext at all, return false
            // if it contains them all, return true
          })
        }
        return true
      }

      if (is.library(program)) {
        // get the grouper canonial
        const grouperCanonical = program.relatedArtifact
          ?.find(related => related.resource?.includes('/Library/'))
          ?.resource

        if (grouperCanonical) {
          const grouperSearchResult = await fetchGrouperLibrary(grouperCanonical)

          // get all grouperValueSet canonicals
          if (is.bundle(grouperSearchResult) && is.library(grouperSearchResult?.entry?.[0]?.resource)) {
            const grouper = grouperSearchResult?.entry?.[0]?.resource as fhir4.Library

            const grouperValueSetCanonicals = grouper.relatedArtifact
              ?.filter(a => a.type == 'composed-of')
              .map(res => res.resource)
              .filter(isDefinedString)

            if (grouperValueSetCanonicals) {
              const grouperValueSets = (await fetchGrouperValueSets(grouperValueSetCanonicals))
                .filter(is.bundle)
                .flatMap(bundle => bundle.entry?.map(e => e.resource))
                .filter(is.valueSet)

              grouperVSets = grouperValueSets

              // if a user has constrained by filtering groupers, show only those indicated
              const filteredValueSets = grouperValueSets
                ?.filter(vs => allowedGrouper(vs?.url as string))

              console.log('filtered123: ', filteredValueSets)

              const leafValueSetResult = await Promise.all(filteredValueSets.map(valueset => {
                const groupTitle = valueset?.title || ''
                const leafUrls = valueset?.compose?.include?.[0]?.valueSet

                leafUrls?.forEach(url => {
                  if (groupsByValueSetCanonical[url]) {
                    groupsByValueSetCanonical[url].push({
                      id: valueset.id || 'Undefined',
                      title: groupTitle
                    })
                  } else {
                    groupsByValueSetCanonical[url] = [
                      {
                        id: valueset.id || 'Undefined',
                        title: groupTitle
                      }
                    ]
                  }
                })

                if (leafUrls) {

                  const stringToFind = req.query.findInVsName as string | undefined
                  // we do not have version info stored re: leaf valuesets
                  // a search for a particular url yields many versions
                  // because we cannot constrain by version
                  return fetchLeafValueSets(leafUrls, stringToFind)
                }
              }))
              leafValueSets = leafValueSetResult.flat(2).filter(is.valueSet)
            }
          }
        }
      }
      const conceptCodesFromConditionVS: fhir4.ValueSetComposeInclude | undefined = conditionsVS?.compose?.include

      const flattenedConditions = conditionsVS?.compose?.include?.map(i => {
        return i?.concept?.map(c => ({
          system: i?.system,
          version: i?.version,
          code: c?.code,
          display: c?.display,
          feLabel: c?.designation?.find(d => d?.use?.system === 'http://snomed.info/sct' && d?.use?.code === 'synonym')?.value || c?.display || 'Missing Value'
        }))
      })?.flat()

      const response: ValueSetTableEntry[] = leafValueSets.map(valueSet => {
        let leafConditions = []
        // condition VS is static, in our CDR
        // only snomed for now, but is an array of code sets by system
        // leaf valuesets will come from cache
        const conditionsFromLeaf = valueSet?.useContext
          ?.filter(ctx => ctx?.code?.system?.endsWith('usage-context-type') && ctx?.code?.code === 'focus')
          ?.map(usageContext => usageContext?.valueCodeableConcept?.coding)
          ?.flat(2)

        // loop through all of the concept code sets from the valueSet
        // if the systems match and the code is in the RCKMS valueset, push to the shared arr
        conditionsFromLeaf?.forEach(condition => {
          const currentLeafCodeSystem = condition?.system
          const currentLeafCode = condition?.code
          let matchingSystemBlock: fhir4.ValueSetComposeInclude | undefined
          if (Array.isArray(flattenedConditions)) {
            matchingSystemBlock = flattenedConditions?.find(s => s?.system === currentLeafCodeSystem && s?.code === currentLeafCode)
          }
          if (matchingSystemBlock) {
            leafConditions.push(matchingSystemBlock)
          }
        })
        console.log('leaf conditions server: ', leafConditions)
        const matchingGroup = Object?.keys(groupsByValueSetCanonical)?.find(k => k?.endsWith(valueSet?.id as string))
        return {
          programName: program?.name || 'Undefined',
          programId: program?.id || 'Undefined',
          title: valueSet.name || 'Undefined',
          canonical: valueSet.url || 'Undefined',
          version: valueSet.version || '',
          conditions: leafConditions || [],
          groups: groupsByValueSetCanonical[matchingGroup || 'Undefined']
        }
      })

      const composedResponse = {
        data: response,
        groupsInProgram: grouperVSets
      }

      res.status(200).send(composedResponse)

    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for leaf valueset details failed.' })
    }
  }
}
