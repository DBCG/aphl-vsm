import FhirClient from '@/backend/clients/FhirClient'
import FhirKitClient, { ResourceType } from 'fhir-kit-client'
import { is } from '@/helpers/is'
import dayjs from 'dayjs'
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

export const fetchGrouperValueSets = async ({ canonicals, whitelistFields }: FetchGrouperVsets) => {
  const result = await Promise.all(canonicals.map(async (canonical) => await fetchByCanonical({
    client: FhirClient.getInstance(),
    resourceType: 'ValueSet',
    canonical,
    whitelistFields
  })))
  return result
}

export const fetchLeafValueSetsByGrouperCanonical = async (grouperLibUrl: string) => {
  if (grouperLibUrl) {
    const grouperSearchResult = await fetchGrouperLibrary({ client: FhirClient.getInstance(), canonical: grouperLibUrl })

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
          const res = await fetchLeafValueSets({ leafValueSetCanonicals })
          return res?.filter((i) => i && is.valueSet(i)) // Clear undefined values
        }
      }
    }
  }
  return []
}

interface FetchLeafs {
  leafValueSetCanonicals: string[],
  titleToFind?: string,
  stewardToFind?: string,
  publisherToFind?: string,
  versionToFind?: string,
  whitelistFields?: string[],
  oidToFind?: string,
  provisionalOnly?: boolean
}

const isValidString = (search: any): boolean => {
  return is.string(search) && search.trim() !== ''
}

export const fetchLeafValueSets = async ({
  leafValueSetCanonicals,
  titleToFind,
  stewardToFind,
  publisherToFind,
  versionToFind,
  whitelistFields,
  oidToFind,
  provisionalOnly
}: FetchLeafs) => {
  let searchParams = {} as any

  let result = []

  if (isValidString(titleToFind)) {
    searchParams['title:contains'] = titleToFind
  }

  // this isn't right, finding the steward is done by looking at extensions
  if (isValidString(publisherToFind)) {
    searchParams['publisher:contains'] = publisherToFind
  }

  if (isValidString(versionToFind)) {
    searchParams['version:contains'] = versionToFind
  }

  if (isValidString(stewardToFind)) {
    searchParams['version:contains'] = versionToFind
  }

    // url:contains is not currently working on CQF for a partial string search
    // so will filter this here instead
  if (isValidString(oidToFind)) {
    leafValueSetCanonicals = leafValueSetCanonicals.filter(c => c.includes(oidToFind as string))
  }

  if (whitelistFields) {
    searchParams['_elements'] = whitelistFields.join(',')
  }

  result = await Promise.all(
    leafValueSetCanonicals.map((canonical) => {
      const [urlNoVersion, version] = canonical.split('|')
      const searchParameters = {
        url: urlNoVersion,
        // status: 'active',
        ...searchParams
      }
      if (version) {
        searchParameters.version = version
      } if (provisionalOnly) {
        searchParameters._tag = 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes|vsm-provisional'
      }
      return FhirClient.getInstance().search({
        resourceType: 'ValueSet',
        searchParams: searchParameters
      })
    }
    )
  )

  try {
    let valueSets
    valueSets = result
      ?.map((e) => {
        if (e.entry) {
          if (e?.entry?.length > 1) {
            // Find latest valueset version to return
            const latestEntry = e.entry.reduce((acc: fhir4.BundleEntry, cur: fhir4.BundleEntry) => {
              const curDate = new Date((cur.resource as fhir4.ValueSet)?.version || 0)
              const accDate = new Date((acc.resource as fhir4.ValueSet)?.version || 0)
              return dayjs(curDate).isAfter(accDate) ? cur : acc
            }, e.entry[0])
            return [latestEntry.resource]
          } else if (e?.entry?.length === 1) {
            return [e.entry[0].resource]
          } else {
            return
          }
        }
      })?.filter(x => !!x) // filter out undefined
      ?.flat()
      ?.sort((a, b) => (a?.name || 'z').localeCompare(b?.name || 'z'))

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
  if (whitelistFields && !client.baseUrl.includes('cts.nlm')) {
    searchParams['_elements'] = whitelistFields.join(',')
  }
  try {
    const result = await client.search({ resourceType, searchParams })
    return result

  } catch (e) {
    console.error('ERROR: ', e)
  }
}