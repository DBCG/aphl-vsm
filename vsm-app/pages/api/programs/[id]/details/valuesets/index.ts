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
  const id = canonical.split('/').slice(-1)
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

// These are from VSAC (array of FHIR Bundle resources)
const fetchlLeafValueSets = (canonicals: string[]) => {
  // TODO: This only uses the first one so we don't overwhelm VSAC
  const tempCanonicals = [canonicals[0]]
  return Promise.all(tempCanonicals.map(canonical => vsacFhirClient.request(canonical)))
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
      const conditionsVS = await fetchConditionsVS(process.env.CONDITIONS_CANONICAL)

      console.log('CONDITIONS: ', conditionsVS)

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
                .filter(is.bundle).flatMap(bundle => bundle.entry?.map(e => e.resource)).filter(is.valueSet)

              const leafValueSetResult = await Promise.all(grouperValueSets.map(valueset => {
                const groupTitle = valueset.title || ''
                const leafUrls = valueset.compose?.include?.[0]?.valueSet

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
                  return fetchlLeafValueSets(leafUrls)
                }
              }))
              leafValueSets = leafValueSetResult.flat(2).filter(is.valueSet)
            }
          }
        }
      }

      const response: ValueSetTableEntry[] = leafValueSets.map(valueSet => {
        // condition VS is static, in our CDR
        const conceptCodesFromConditionVS = conditionsVS?.compose?.include?.[0]
        // leaf valuesets come from VSAC
        const conceptsFromLeaf = valueSet.compose?.include[0].concept
        console.log('valueset: %j', valueSet, null, 2)
        // if the leaf valueset
        console.log('concepts from vs!!!: ', conceptCodes)
        console.log('leaf VS!!!: ', valueSet)
        console.log('Concepts from leaf!!!: ', conceptsFromLeaf)
        const leafFocusContext = valueSet
          ?.useContext
          ?.filter(
            ctx => ctx?.code?.system?.endsWith('usage-context-type')
              && ctx?.code?.code === 'focus'
              && ctx?.valueCodeableConcept?.coding?.[0]?.system === "http://snomed.info/sct"
          )

        console.log('LEAF: ', leafFocusContext)

        let conditionsFromLeaf

        if (leafFocusContext) {
          conditionsFromLeaf = leafFocusContext?.map(i => ({
            text: i?.valueCodeableConcept?.text || '',
            code: i?.valueCodeableConcept?.coding?.[0]?.code
          }))
        }

        return {
          title: valueSet.name || 'Undefined',
          canonical: valueSet.url || 'Undefined',
          version: valueSet.version || '',
          conditions: conditionsFromLeaf || [],
          groups: groupsByValueSetCanonical[valueSet.url || 'Undefined']
        }
      })

      console.log("response", JSON.stringify(response, null, 2))


      res.status(200).send(response)

    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for grouper libraries failed.' })
    }
  }
}
