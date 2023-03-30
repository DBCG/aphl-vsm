import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { DataItem, Result } from '@/hooks/useGetProgramValueSetDetails'
import { fetchGrouperValueSets, fetchGrouperLibrary, fetchLeafValueSets } from '@/helpers/server/serverValueSetHelper'

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

// Whitelisting ValueSet fields to avoid querying the 'expansion' field
// as it could be quite large and slow down the application
const WHITELIST_VALUESET_FIELDS = [
  'extension',
  'url',
  'identifier',
  'version',
  'name',
  'title',
  'status',
  'publisher',
  'description',
  'useContext',
  'purpose',
  'compose'
]

const isDefinedString = (item: any): item is string => {
  return !!item
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Result | { error: string }>): Promise<void> {
  const groupsByValueSetCanonical: Record<string, Group[]> = {}
  if (req.method === 'GET') {
    let leafValueSets: fhir4.ValueSet[] | undefined = []
    let allGrouperVSets: fhir4.ValueSet[] = []
    try {
      const program = await fhirCdrClient.read({ resourceType: 'Library', id: req.query.id as string })
      // disabling proto-cache because it causes problems with updating groupers
      if (!is.library(program)) {
        return res.status(400).json({ error: `Program must be a FHIR Library` })
      }
      // get the grouper canonical, which is a Library resource
      // the program only has 2 relatedArtifacts: a Library and a PlanDefinition
      const grouperLibraryCanonical = getGrouperLibraryCanonical(program)
      const grouperStatus = program.status // active programs get active groupers, draft get draft groupers
      // there is still going to be a bug here until we fix the fact that groupers are unversioned after draft

      if (!grouperLibraryCanonical) {
        return res.status(400).json({ error: `Missing URL for grouper library with id ${req.query.id}.` })
      }

      const grouperSearchResult = await fetchGrouperLibrary({ client: fhirCdrClient, canonical: grouperLibraryCanonical, grouperStatus })

      // get all grouperValueSet canonicals
      if (is.bundle(grouperSearchResult) && is.library(grouperSearchResult?.entry?.[0]?.resource)) {

        const grouperLib = grouperSearchResult?.entry?.[0]?.resource as fhir4.Library

        const grouperValueSetCanonicals = grouperLib.relatedArtifact
          ?.filter((a) => a.type == 'composed-of')
          .map((res) => res.resource)
          .filter(isDefinedString)

        if (grouperValueSetCanonicals) {
          allGrouperVSets = (
            (await fetchGrouperValueSets({ canonicals: grouperValueSetCanonicals }))
              .filter(is.bundle)
              .flatMap((bundle) => bundle.entry?.map((e) => e.resource!))
              .filter((x) => !!x) as fhir4.Resource[]
          ) // filter out undefined
            .filter(is.valueSet)

          const leafValueSetCanonicals: string[] = []

          allGrouperVSets.forEach((grouperVs) => {
            const groupTitle = grouperVs?.title || ''
            const leafUrlsInGrouper = (grouperVs?.compose?.include
              ?.map((item) => item?.valueSet)
              ?.filter((x) => !!x) // filter out undefined
              ?.flat() || []) as string[]

            // add groups to the leaf URLs
            leafUrlsInGrouper?.forEach((url) => {
              if (!url) return

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

          const grouperSearchResult = await fetchGrouperLibrary({
            client: fhirCdrClient,
            canonical: grouperLibraryCanonical,
            grouperStatus
          })

          // get all grouperValueSet canonicals
          if (is.bundle(grouperSearchResult) && is.library(grouperSearchResult?.entry?.[0]?.resource)) {

            const grouperLib = grouperSearchResult?.entry?.[0]?.resource as fhir4.Library

            const grouperValueSetCanonicals = grouperLib.relatedArtifact
              ?.filter((a) => a.type == 'composed-of')
              .map((res) => res.resource)
              .filter(isDefinedString)

            if (grouperValueSetCanonicals) {
              allGrouperVSets = (
                (await fetchGrouperValueSets({ canonicals: grouperValueSetCanonicals }))
                  .filter(is.bundle)
                  .flatMap((bundle) => bundle.entry?.map((e) => e.resource!))
                  .filter((x) => !!x) as fhir4.Resource[]
              ) // filter out undefined
                .filter(is.valueSet)

              const leafValueSetCanonicals: string[] = []

              allGrouperVSets.forEach((grouperVs) => {
                const groupTitle = grouperVs?.title || ''
                const leafUrlsInGrouper = (grouperVs?.compose?.include
                  ?.map((item) => item?.valueSet)
                  ?.filter((x) => !!x) // filter out undefined
                  ?.flat() || []) as string[]

                // add groups to the leaf URLs
                leafUrlsInGrouper?.forEach((url) => {
                  if (!url) return

                  // only adding unversioned to the array
                  const [urlNoVersion, version] = url.split('|')

                  leafValueSetCanonicals.push(urlNoVersion)
                  const groupToAdd = {
                    id: grouperVs.id || 'Undefined',
                    url: grouperVs.url || 'Undefined',
                    defaultValueSetVersion: version,
                    title: groupTitle
                  }
                  // should also handle if version exists... is that its own key? or just within the object
                  if (groupsByValueSetCanonical[urlNoVersion]) {
                    groupsByValueSetCanonical[urlNoVersion].push(groupToAdd)
                  } else {
                    groupsByValueSetCanonical[urlNoVersion] = [groupToAdd]
                  }
                })
              })
              // })

              if (leafValueSetCanonicals.length) {
                const stringToFind = req.query.findInVsName as string | undefined
                const stewardToFind = req.query.findInSteward as string | undefined
                const versionToFind = req.query.findInVersion as string | undefined

                leafValueSets = await fetchLeafValueSets(
                  leafValueSetCanonicals,
                  stringToFind,
                  stewardToFind,
                  versionToFind,
                  WHITELIST_VALUESET_FIELDS
                )
              }
            }
          }
        }
      }

      // TODO: reconsider this filter as it may hide problems
      const response = leafValueSets
        ?.filter((x) => !!x)
        .map((valueSet) => {
          const leafVsCanonical = Object?.keys(groupsByValueSetCanonical)?.find((k) => k === valueSet.url)
          const groupsVsBelongsTo = groupsByValueSetCanonical[leafVsCanonical || 'Undefined']
          const valueSetPinnedVersion = groupsVsBelongsTo?.[0]?.defaultValueSetVersion

          let result = {
            programName: program?.name || 'Undefined',
            programId: program?.id || 'Undefined',
            programStatus: program?.status || 'Unknown',
            title: valueSet?.name || 'Undefined',
            canonical: valueSet.url || 'Undefined',
            version: valueSet.version || '',
            valueSetPinnedVersion,
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
              return !!groupsVsBelongsTo?.find((g) => groupIdsToFilterBy.includes(g?.id))
            }
            // if there's more than 1 group, the valuesets must match ALL active group filters
            return groupIdsToFilterBy?.every((id: string) => groupsVsBelongsTo?.find((g) => g?.id === id))
          }
          const valueSetContainsRequiredCondition = () => {
            const useContextConditions = valueSet?.useContext?.filter(
              (i) => i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type')
            )

            // if no filters active, the result is allowed by default
            if (!conditionCodesToFilterBy) return true
            // if only one filter selected
            if (conditionCodesToFilterBy.length == 1) {
              return useContextConditions?.find((item) =>
                conditionCodesToFilterBy?.includes(item?.valueCodeableConcept?.coding?.[0]?.code as string)
              )
            }
            // if more than 1 condition, valuesets must match all condition filters
            return conditionCodesToFilterBy?.every((code: string) =>
              useContextConditions?.find((c) => c?.valueCodeableConcept?.coding?.[0]?.code === code)
            )
          }

          if (valueSetInAllowedGroup() && valueSetContainsRequiredCondition()) {
            return result
          }
        })
        .filter((x) => !!x) as DataItem[] // filter out any undefined items

      const composedResponse = {
        programStatus: program.status,
        data: response,
        groupsInProgram: allGrouperVSets
      }


      return res.status(200).send(composedResponse)
    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for leaf valueset details failed.' })
    }
  }
}