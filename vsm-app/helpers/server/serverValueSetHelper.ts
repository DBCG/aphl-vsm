import FhirClient from '@/backend/clients/FhirClient'
import FhirKitClient, { ResourceType } from 'fhir-kit-client'
import { is } from '@/helpers/is'
import dayjs from 'dayjs'
import Logger from './logger'
interface FetchGrouperLib {
  client: FhirKitClient
  canonical: string
  grouperStatus?: fhir4.ValueSet['status']
}

export const fetchGrouperLibrary = async ({ client, canonical, grouperStatus }: FetchGrouperLib) => {
  return await fetchByCanonical({ client, resourceType: 'Library', canonical, status: grouperStatus })
}

interface FetchGrouperVsets {
  canonicals: string[]
  whitelistFields?: string[]
}

export const fetchGrouperValueSets = async ({ canonicals, whitelistFields }: FetchGrouperVsets) => {
  const result = await Promise.all(
    canonicals.map(
      async (canonical) =>
        await fetchByCanonical({
          client: FhirClient.getInstance(),
          resourceType: 'ValueSet',
          canonical,
          whitelistFields
        })
    )
  )
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
          return res?.filter((i: any) => i && is.valueSet(i)) // Clear undefined values
        }
      }
    }
  }
  return []
}

/**
 * Converts a JavaScript object to a URL query string
 */
function objectToQueryParams(obj: any, encodeValues = true) {
  // Return empty string for null or undefined
  if (obj === null || obj === undefined) {
    return ''
  }

  // Make sure we're working with an object
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Input must be a plain object')
  }

  // Build the query string
  const params = Object.entries(obj)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle different value types
      if (Array.isArray(value)) {
        // Arrays become repeated parameters: arr[]=[val1]&arr[]=[val2]
        return value.map((item) => `${key}[]=${encodeValues ? encodeURIComponent(item) : item}`).join('&')
      } else if (typeof value === 'object') {
        // For nested objects, convert to JSON string
        return `${key}=${encodeValues ? encodeURIComponent(JSON.stringify(value)) : JSON.stringify(value)}`
      } else {
        // @ts-ignore
        return `${key}=${encodeValues ? encodeURIComponent(value) : value}`
      }
    })
    .join('&')

  return params.length > 0 ? `?${params}` : ''
}

interface FetchLeafs {
  leafValueSetCanonicals: string[]
  titleToFind?: string
  stewardToFind?: string
  publisherToFind?: string
  versionToFind?: string
  whitelistFields?: string[]
  oidToFind?: string
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
    leafValueSetCanonicals = leafValueSetCanonicals.filter((c) => c.includes(oidToFind as string))
  }

  if (whitelistFields && whitelistFields?.length > 0) {
    searchParams['_elements'] = whitelistFields.join(',')
  }

  const batchPayload = leafValueSetCanonicals.map((canonical) => {
    const [urlNoVersion, version] = canonical.split('|')
    const searchParameters = {
      url: urlNoVersion,
      // status: 'active',
      ...searchParams
    }
    if (version) {
      searchParameters.version = version
    }
    if (provisionalOnly) {
      searchParameters._tag = 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes|vsm-provisional'
    }

    return {
      resourceType: 'ValueSet',
      request: {
        method: 'GET',
        url: `ValueSet${objectToQueryParams(searchParameters)}`
      }
    }
  })

  const batchResults = await FhirClient.getInstance().batch({
    body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: batchPayload
    }
  })

  try {
    let valueSets
    valueSets = batchResults.entry
      ?.map((e: any) => {
        const vsBundleEntry = e?.resource?.entry
        if (vsBundleEntry) {
          if (vsBundleEntry?.length > 1) {
            // Find latest valueset version to return
            const latestEntry = vsBundleEntry.reduce((acc: fhir4.BundleEntry, cur: fhir4.BundleEntry) => {
              const curDate = new Date((cur.resource as fhir4.ValueSet)?.version || 0)
              const accDate = new Date((acc.resource as fhir4.ValueSet)?.version || 0)
              return dayjs(curDate).isAfter(accDate) ? cur : acc
            }, vsBundleEntry?.[0])
            return [latestEntry.resource]
          } else if (vsBundleEntry?.length === 1) {
            return [vsBundleEntry?.[0]?.resource]
          } else {
            return
          }
        }
      })
      ?.filter((x: any) => !!x) // filter out undefined
      ?.flat()
      ?.sort((a: fhir4.ValueSet, b: fhir4.ValueSet) => (a?.name || 'z').localeCompare(b?.name || 'z'))

    return valueSets
  } catch (e) {
    Logger.getLogger().error('error while fetching leaf valuesets', e)
    throw e
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
