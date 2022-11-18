// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import FhirKitClient from 'fhir-kit-client'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import { fetchProgram, getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { valuesetDataForDisplay } from '@/helpers/valueSetHelpers'

// Items in the table
interface Group {
  id: string
  title: string
  url: string
}

interface FormattedVSItem {
  system: string
  version: string
  code: string
  display?: string
}


interface ValueSetTableEntry {
  programName: string
  programId: string
  title: string
  canonical: string
  version: string
  valueSet?: fhir4.ValueSet | undefined
  conditions: FormattedVSItem[]
  groups: Group[]
}

// vsac limits queries
// see: https://www.nlm.nih.gov/vsac/support/usingvsac/vsacsvsapiv2.html (Terms of Service)
const fetchByCanonical = (client: FhirKitClient, resourceType: string, canonical: string) => {

  const [url, version] = canonical.split('|')
  const searchParams: Record<string, string> = { url }
  if (version) { searchParams.version = version }
  const result = client.search({ resourceType, searchParams })

  return result
}

const fetchGrouperLibrary = (client: FhirKitClient, canonical: string) => {
  return fetchByCanonical(client, 'Library', canonical)
}

const fetchGrouperValueSets = (canonicals: string[]) => {
  return Promise.all(
    canonicals.map(canonical => fetchByCanonical(fhirCdrClient, 'ValueSet', canonical))
  )
}

const fetchLeafValueSets = async (
  canonicals: string[],
  nameStr: string | undefined,
  stewardStr: string | undefined,
  versionStr: string | undefined
) => {
  let searchParams = {} as any

  if (is.string(nameStr)) {
    searchParams['name:contains'] = nameStr
  }

  if (is.string(stewardStr)) {
    searchParams['publisher:contains'] = stewardStr
  }

  if (is.string(versionStr)) {
    searchParams['version:contains'] = versionStr
  }

  try {

    const result = await Promise.all(canonicals.map(canonical =>
    (fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: canonical,
        status: 'active',
        ...searchParams
      }
    }))
    ))

    const valueSets = result?.map((e) => {
      if (e.entry) {
        return e.entry.map((entry: fhir4.BundleEntry) => {
          const resource = entry?.resource as fhir4.ValueSet
          if (resource) {
            // instead of returning whole valuesets, just return a portion of the data
            return (valuesetDataForDisplay(resource))
          }
        })
      }
    })
    ?.flat()
    ?.sort((a, b) => (a?.name || 'z').localeCompare(b?.name || 'z'))
    ?.filter((value, index, self) => (
      // @ts-ignore-next-line filter out multiple ids
      self.findIndex(v2 => v2?.id === value?.id) === index
    ))

    return valueSets
  } catch (e) {
    // TODO: handle
    console.error('error here a', e)
  }

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
      // disabling proto-cache because it causes problems with updating groupers
      if (is.library(program)) {
        // get the grouper canonical, which is a Library resource
        // the program only has 2 relatedArtifacts: a Library and a PlanDefinition
        const grouperLibraryCanonical = getGrouperLibraryCanonical(program)

        if (grouperLibraryCanonical) {
          const grouperSearchResult = await fetchGrouperLibrary(fhirCdrClient, grouperLibraryCanonical)

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

              const leafValueSetCanonicals: string[] = []

              allGrouperVSets.forEach(grouperVs => {
                const groupTitle = grouperVs?.title || ''
                const leafUrlsInGrouper = grouperVs?.compose?.include?.[0]?.valueSet

                // add groups to the leaf URLs
                leafUrlsInGrouper?.forEach(url => {
                  leafValueSetCanonicals.push(url)

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
              })

              if (leafValueSetCanonicals.length) {
                const stringToFind = req.query.findInVsName as string | undefined
                const stewardToFind = req.query.findInSteward as string | undefined
                const versionToFind = req.query.findInVersion as string | undefined

                // @ts-ignore-next-line
                leafValueSets = await fetchLeafValueSets(
                  leafValueSetCanonicals,
                  stringToFind,
                  stewardToFind,
                  versionToFind
                )
              }
            }
          }
        }
      }

      // TODO: reconsider this filter as it may hide problems
      const response = await leafValueSets?.filter(x => x).map(valueSet => {

        const leafVsCanonical = Object?.keys(groupsByValueSetCanonical)?.find(k => k === valueSet.url as string)
        const groupsVsBelongsTo = groupsByValueSetCanonical[leafVsCanonical || 'Undefined']

        let result = {
          programName: program?.name || 'Undefined',
          programId: program?.id || 'Undefined',
          title: valueSet?.name || 'Undefined',
          canonical: valueSet.url || 'Undefined',
          version: valueSet.version || '',
          valueSet: valueSet,
          groups: groupsVsBelongsTo
        }

        const filterGroups = req?.query?.groups as string | undefined
        const filterConditions = req?.query?.conditions as string | undefined
        const groupIdsToFilterBy = filterGroups?.split(',')
        const conditionCodesToFilterBy = filterConditions?.split(',')

        const valueSetInAllowedGroup = () => {
          // if no group filters active, valueset is allowed by default
          if (!groupIdsToFilterBy) return true
          // if only one filter selected
          if (groupIdsToFilterBy?.length === 1) {
            // do the vs groups include the filtered group
            return !!groupsVsBelongsTo?.find(g => groupIdsToFilterBy.includes(g?.id))
          }
          // if there's more than 1 group, the valuesets must match ALL active group filters
          return groupIdsToFilterBy?.every((id: string) => groupsVsBelongsTo?.find(g => g?.id === id))
        }
        const valueSetContainsRequiredCondition = () => {
          const useContextConditions = valueSet?.useContext
            ?.filter(i => i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type'))

          // if no filters active, the result is allowed by default
          if (!conditionCodesToFilterBy) return true
          // if only one filter selected
          if (conditionCodesToFilterBy.length == 1) {
            return useContextConditions?.find(item => conditionCodesToFilterBy?.includes(item?.valueCodeableConcept?.coding?.[0]?.code as string))
          }
          // if more than 1 condition, valuesets must match all condition filters
          return conditionCodesToFilterBy?.every((code: string) => useContextConditions?.find(c => c?.valueCodeableConcept?.coding?.[0]?.code === code))
        }

        if (valueSetInAllowedGroup() && valueSetContainsRequiredCondition()) {
          return result
        }
      }).filter(x => x) as ValueSetTableEntry[] // filter out any undefined items

      const composedResponse = {
        data: response,
        groupsInProgram: allGrouperVSets
      }

      res.status(200).send(composedResponse)

    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for leaf valueset details failed.' })
    }
  }
}
