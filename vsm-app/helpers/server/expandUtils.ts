import FhirKitClient from 'fhir-kit-client'
import { cloneDeep } from 'lodash'
import { is } from '../is'
import Logger from '@/helpers/server/logger'
import { vsacFhirClient } from 'fhirClients'
import { extractOidFromUrl } from '@/utils'

interface GrouperIdsByUrlItem {
  version?: string
  grouperIds?: Set<string>
}

interface CodeData {
  system: string
  code: string
  version: string | undefined
  display: string | undefined
}

interface LeafData {
  groupersBelongsTo: string[]
  leafDisplay: string
  url: string
}

type MatchesFromServer = Record<string, { leafData: LeafData[], codeData: CodeData }>

type GrouperIdsByUrl = Record<string, GrouperIdsByUrlItem>

interface BuildUrlParams {
  leafUrl: string
  leafVersion: string | undefined
}

const buildSearchUrl = ({ leafUrl, leafVersion }: BuildUrlParams) => (
  `/ValueSet?url=${leafUrl}&_sort=-version&_count=1` + (leafVersion ? `&version=${leafVersion}` : '')
)

interface FindMatches {
  vs: fhir4.ValueSet
  codeToFind: string
  systemToFind?: string
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
  }) as fhir4.Bundle

  // using <any> here, fhir types doesn't seem to map the {resource, response} obj structure for a bundle response
  const result = allGroupers?.entry
    ?.filter(entry => entry.resource?.resourceType === 'Bundle')
    ?.map(entry => entry.resource as fhir4.Bundle)
    ?.map((i) => i?.entry?.[0]?.resource)
    ?.filter(resource => resource?.resourceType === 'ValueSet')
    ?.filter((x) => !!x) || []
  return result as fhir4.ValueSet[]
}

const arrangeGroupersByLeafRef = (groupers: fhir4.ValueSet[]) => {
  const grouperIdsByLeafRef: GrouperIdsByUrl = {}
  for (const grouper of groupers) {

    const vsRefs = grouper?.compose?.include?.map(i => i?.valueSet?.[0])?.filter(x => Boolean(x)).map(x => x!) || []

    vsRefs.forEach((ref: string, ind) => {
      const [url, version] = ref.split('|')
      const existingGrouperIds = grouperIdsByLeafRef?.[url]?.grouperIds

      if (typeof existingGrouperIds !== 'undefined' && existingGrouperIds.size) {
        grouperIdsByLeafRef[url].grouperIds = new Set([...existingGrouperIds, grouper.id!])
      } else {
        grouperIdsByLeafRef[url] ??= {}
        grouperIdsByLeafRef[url].grouperIds = new Set([grouper.id!])
      }
      grouperIdsByLeafRef[url].version = version
    })
  }
  return grouperIdsByLeafRef
}

interface FindMatchingExpansions {
  leafVSets: fhir4.ValueSet[]
  expandParameters: fhir4.Parameters
  terminologyClient: FhirKitClient
}

const filterRejectPromiseValues = (items: PromiseSettledResult<any>[]) => (
  items?.filter(item => is.promiseFulfilled(item))
    ?.map((res: any) => res.value) as fhir4.ValueSet[]
)

const findMatchingExpansions = async (
  { leafVSets, expandParameters, terminologyClient }: FindMatchingExpansions
) => {
  const expandedLeafs = await Promise.allSettled(
    leafVSets.map((leaf: fhir4.ValueSet) => (
      terminologyClient.operation({
        name: '$expand',
        id: leaf.id,
        resourceType: 'ValueSet',
        method: 'POST',
        input: JSON.stringify(expandParameters),
        options: {
          headers: {
            'content-type': 'application/json'
          }
        }
      })
    ))
  ).then((leafs) => filterRejectPromiseValues(leafs))

  const filteredItems = 'test' // TODO FINISH THIS

}

interface FindMatchingVsetUrlsParams {
  fhirCdrClient: FhirKitClient
  vsacFhirClient: FhirKitClient
  parameters: fhir4.Parameters
  codeToFind: string
  systemToFind?: string
  groupersToSearch: string[]
}

// Set and ensure only one instance of the parameter valueSetVersion
const setParameterVsVersion = (parameters: fhir4.Parameters, valueSet: fhir4.ValueSet) => {
  const clearedParameter = parameters.parameter?.filter(i => i.name !== 'valueSetVersion') || []
  clearedParameter.push({
    name: 'valueSetVersion',
    valueString: valueSet.version
  })
  parameters.parameter = clearedParameter
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

  let returnData: MatchesFromServer = {}

  const matchingLeafs = async (groupersByLeaf: GrouperIdsByUrl) => {
    if (Object.keys(groupersByLeaf).length <= 0) return []

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
    }) as fhir4.Bundle

    // is this flattening desirable? does it hide that multiple same vsets might exist? need to check
    const leafsFromCQF = allLeafs.entry
      ?.filter((i) => i.resource?.resourceType === 'Bundle')
      ?.map((i) => i.resource as fhir4.Bundle)
      ?.flatMap((i) => i?.entry)
      ?.filter((x) => x?.resource?.resourceType === 'ValueSet')
      ?.map((x) => x?.resource as fhir4.ValueSet)
      ?.filter((y) => Boolean(y)) || []

    // now, you have the leafs from the CQF server, but we need the proper ID in order to $expand from the terminology server
    const vsacEntries = leafsFromCQF.map((leafVs) => {
      // we strip VSAC-specific appended version from URL before saving
      const leafUrl = leafVs.url!
      const leafVersion = groupersByLeaf?.[leafUrl]?.version
      const searchUrl = buildSearchUrl({ leafUrl: leafVs.url!, leafVersion })

      return {
        request: {
          method: 'GET' as fhir4.BundleEntryRequest["method"],
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
    }) as fhir4.Bundle

    const allVsacLeafs = vsacLeafBundle?.entry
      ?.filter(entry => entry.resource?.resourceType === 'Bundle')
      ?.map(entry => entry.resource as fhir4.Bundle)
      ?.filter((i) => !!i?.entry?.length)
      ?.flatMap((i) => i?.entry)
      ?.filter(entry => entry?.resource?.resourceType === 'ValueSet')
      ?.map(entry => entry?.resource as fhir4.ValueSet)
      ?.filter((x) => Boolean(x)) || []

    const matchingExpansions = async () => {
      const expansions = await Promise.allSettled(
        allVsacLeafs.map((leaf: fhir4.ValueSet) => {
          setParameterVsVersion(parameters, leaf)
          const parametersFetchOptions = getExpandFetchOptions(parameters)
          const oid = extractOidFromUrl(leaf.url!)
          const url = `${vsacFhirClient.baseUrl}/ValueSet/${oid}/$expand`
          Logger.getLogger().debug(`Running $expand to vsac url: ${url} with these options: ${JSON.stringify(parametersFetchOptions)}`)
          return fetch(url, parametersFetchOptions).then(i => i.json())
        }
      ))

      // filter out undefined results (maybe better error handling eventually)
      // how to handle these Promise types?
      const expandedItemsFromVSAC = expansions
        ?.filter((promiseItem): promiseItem is PromiseFulfilledResult<fhir4.ValueSet> => promiseItem.status === 'fulfilled')
        ?.map((res) => res.value)

      // only want valuesets that contain the code + (optional) system
      const matches = expandedItemsFromVSAC?.filter((vs: fhir4.ValueSet) => {
        return findMatches({ vs, codeToFind, systemToFind }).isMatch
      })

      // return the urls of valuesets that contain the code
      matches?.forEach(i => {
        const vsUrl = i?.url?.split('-')?.[0]
        if (!vsUrl) {
          throw "Missing vsURL for: " + i.id
        }
        const grouperInfo = Array.from(groupersByLeaf?.[vsUrl]?.grouperIds || [])
        
        const matchingCodeItem = findMatches({ vs: i, codeToFind, systemToFind })?.codeMatches || {}
        const versionKey = `${codeToFind}||${matchingCodeItem!.version}`

        if (returnData[versionKey]) {
          returnData[versionKey].leafData.push({
            leafDisplay: i?.title || i?.name as string,
            groupersBelongsTo: grouperInfo,
            url: vsUrl,
          })
        } else {
          returnData[versionKey] = ({
            leafData: [{
              leafDisplay: i?.title || i?.name as string,
              groupersBelongsTo: grouperInfo,
              url: vsUrl,
            }],
            // @ts-ignore
            codeData: matchingCodeItem
          })
          }
        })
      return returnData
    }

    try {
      const matchingVSets = await matchingExpansions()
      return matchingVSets
    } catch (e) {
      Logger.getLogger().error(e)
      return []
    }
  }

  const allGroupers = await getSpecifiedGroupers(groupersToSearch, fhirCdrClient)
  const grouperIdsByLeaf = arrangeGroupersByLeafRef(allGroupers)
  const matchingValueSetUrlsAndCodes = await matchingLeafs(grouperIdsByLeaf)

  return matchingValueSetUrlsAndCodes
}

const getExpandFetchOptions = (parameters: fhir4.Parameters) => {
  if (parameters?.parameter?.length) {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...vsacFhirClient.customHeaders
      },
      body: JSON.stringify(parameters)
    }
  } else {
    return {
      method: 'GET',
      headers: {
        ...vsacFhirClient.customHeaders
      }
    }
  }
}

export {
  buildSearchUrl,
  findMatches,
  getSpecifiedGroupers,
  arrangeGroupersByLeafRef,
  getExpandFetchOptions,
  findMatchingVsetUrls,
  setParameterVsVersion
}