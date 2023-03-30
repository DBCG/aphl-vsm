import { fhirCdrClient } from 'fhirClients'
import FhirKitClient, { ResourceType } from 'fhir-kit-client'
import { is } from '@/helpers/is'

interface FetchGrouperLib {
  client: FhirKitClient
  canonical: string
  grouperStatus?: fhir4.ValueSet['status']
}

export const fetchGrouperLibrary = async ({ client, canonical, grouperStatus }: FetchGrouperLib) => {
  return await fetchByCanonical({ client, resourceType: 'Library', canonical, status: grouperStatus })
}

interface FetchGrouperVsets {
  canonicals: string[],
  whitelistFields?: string[]
}

export const fetchGrouperValueSets = ({ canonicals, whitelistFields }: FetchGrouperVsets) => {

  return Promise.all(canonicals.map(async (canonical) => await fetchByCanonical({
    client: fhirCdrClient,
    resourceType: 'ValueSet',
    canonical,
    whitelistFields
  })))
}

export const fetchLeafValueSetsByGrouperCanonical = async (grouperLibUrl: string) => {
  if (grouperLibUrl) {
    const grouperSearchResult = await fetchGrouperLibrary({ client: fhirCdrClient, canonical: grouperLibUrl })

    // get all grouperValueSet canonicals
    if (is.bundle(grouperSearchResult) && is.library(grouperSearchResult?.entry?.[0]?.resource)) {
      const grouper = grouperSearchResult?.entry?.[0]?.resource as fhir4.Library

      const grouperValueSetCanonicals = grouper.relatedArtifact
        ?.filter((a) => a.type === 'composed-of')
        .map((res) => res.resource)
        .filter(is.definedString)

      if (grouperValueSetCanonicals) {
        const allGrouperVSets = (
          (await fetchGrouperValueSets({ canonicals: grouperValueSetCanonicals }))
            .filter(is.bundle)
            .flatMap((bundle) => bundle.entry?.map((e) => e.resource!))
            .filter((x) => !!x) as fhir4.Resource[]
        ) // filter out undefined
          .filter(is.valueSet)

        const leafValueSetCanonicals: string[] = []

        allGrouperVSets.forEach((grouperVs) => {
          const leafUrlsInGrouper = (grouperVs?.compose?.include
            ?.map((item) => item?.valueSet)
            ?.filter((x) => !!x) // filter out undefined
            ?.flat()
            ?.filter((x) => !!x) || []) as string[] // filter out undefined urls

          // add groups to the leaf URLs
          leafValueSetCanonicals.push(...leafUrlsInGrouper)
        })
        if (leafValueSetCanonicals.length) {
          const res = await fetchLeafValueSets(leafValueSetCanonicals)
          return res?.filter((i) => i && is.valueSet(i)) // Clear undefined values
        }
      }
    }
  }
  return []
}
export const fetchLeafValueSets = async (
  canonicals: string[],
  nameStr?: string,
  stewardStr?: string,
  versionStr?: string,
  whitelistFields?: string[]
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
  if (whitelistFields) {
    searchParams['_elements'] = whitelistFields.join(',')
  }
  try {
    const result = await Promise.all(
      canonicals.map((canonical) =>
        fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: canonical,
            status: 'active',
            ...searchParams
          }
        })
      )
    )

    const valueSets = result
      ?.map((e) => {
        if (e.entry) {
          return (<fhir4.Bundle>e).entry?.map((entry: fhir4.BundleEntry) => {
            const resource = entry?.resource as fhir4.ValueSet
            if (resource) {
              // instead of returning whole valuesets, just return a portion of the data
              return resource
            }
          })
        }
      })
      ?.flat()
      ?.sort((a, b) => (a?.name || 'z').localeCompare(b?.name || 'z'))
      ?.filter(
        (value, index, self) =>
          // filter out multiple ids
          self.findIndex((v2) => v2?.id === value?.id) === index
      ) as fhir4.ValueSet[]

    return valueSets
  } catch (e) {
    // TODO: handle
    console.error('error here a', e)
  }
}

interface FetchCanonical {
  client: FhirKitClient
  resourceType: ResourceType
  canonical: string
  whitelistFields?: string[]
  status?: string
}

// vsac limits queries
// see: https://www.nlm.nih.gov/vsac/support/usingvsac/vsacsvsapiv2.html (Terms of Service)
export const fetchByCanonical = async ({ client, resourceType, canonical, whitelistFields, status }: FetchCanonical) => {
  const [url, version] = canonical.split('|')
  const searchParams: Record<string, string> = { url }
  if (version) {
    searchParams.version = version
  }
  if (status) {
    searchParams.status = status
  }
  if (whitelistFields) {
    searchParams['_elements'] = whitelistFields.join(',')
  }
  const result = await client.search({ resourceType, searchParams })
  return result
}
