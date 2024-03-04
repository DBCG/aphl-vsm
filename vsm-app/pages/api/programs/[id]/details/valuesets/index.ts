import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { Result } from '@/hooks/useGetProgramValueSetDetails'
import { fetchGrouperValueSets, fetchGrouperLibrary, fetchLeafValueSets } from '@/helpers/server/serverValueSetHelper'
import logger from '@/helpers/server/logger'

// Items in the table
interface Group {
  id: string
  title: string
  url: string
  defaultValueSetVersion?: string
}

interface ErrorRes {
  error: string
}

// Whitelisting ValueSet fields to avoid querying the 'expansion' field
// as it could be quite large and slow down the application
export const WHITELIST_VALUESET_FIELDS = [
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
// ------------------------------------------------------------------------------------------------
// ------------------------HELPER FUNCTIONS FOR ROUTE----------------------------------------------
// ------------------------------------------------------------------------------------------------
const isDefinedString = (item: any): item is string => {
  return !!item
}

const getProgram = async (programId: string): Promise<fhir4.Library | ErrorRes> => {
  const program = await fhirCdrClient.read({ resourceType: 'Library', id: programId })
  // disabling proto-cache because it causes problems with updating groupers
  if (!is.library(program)) {
    return { error: `Program ${programId} must be a FHIR Library` }
  }
  return program
}

const getGrouperLibrary = async (program: fhir4.Library): Promise<fhir4.Library | ErrorRes> => {
  // get the grouper canonical, which is a Library resource
  // the program only has 2 relatedArtifacts: a Library and a PlanDefinition
  const grouperLibraryCanonical = getGrouperLibraryCanonical(program)
  if (!grouperLibraryCanonical) {
    return { error: `Could not find Grouper Library canonical for Program ${program.id}` }
  }
  const grouperStatus = program.status // active programs get active groupers, draft get draft groupers
  // there is still going to be a bug here until we fix the fact that groupers are unversioned after draft

  const grouperSearchResult = await fetchGrouperLibrary({ client: fhirCdrClient, canonical: grouperLibraryCanonical, grouperStatus })

  const result = grouperSearchResult?.entry?.[0]?.resource
  if (is.library(result)) {
    return result
  }
  return { error: `Could not get Grouper Library for Program ${program.id}` }
}

const getLeafUrlsFromGrouper = (grouperVs: fhir4.ValueSet) =>
  grouperVs?.compose?.include
    ?.map((item) => item?.valueSet)
    ?.filter((x) => !!x) // filter out undefined
    ?.flat() || []

// All leaf valuesets are required to belong to at least one grouper
// so if none exist, this is a problem
const getGrouperValuesets = async (grouperLib: fhir4.Library): Promise<fhir4.ValueSet[] | ErrorRes> => {
  const grouperValueSetCanonicals = grouperLib.relatedArtifact
    ?.filter((a) => a.type == 'composed-of')
    .map((res) => res.resource)
    .filter(isDefinedString)

  if (!grouperValueSetCanonicals) return { error: `No Grouper Valuesets linked to Library ${grouperLib.id}` }
  const allGrouperVSets = (
    (await fetchGrouperValueSets({ canonicals: grouperValueSetCanonicals }))
      .filter(is.bundle)
      .flatMap((bundle) => bundle?.entry?.map((e) => e?.resource!))
      .filter((x) => !!x) as fhir4.Resource[]
  ).filter(is.valueSet)

  if (!allGrouperVSets) return { error: `No Grouper Valuesets found for Library ${grouperLib.id}` }
  return allGrouperVSets
}

interface GetLeafs {
  allGrouperVSets: fhir4.ValueSet[]
  titleToFind: string
  stewardToFind: string
  versionToFind: string
  oidToFind: string
  provisionalOnly?: boolean
}

type LeafVersionsByUrl = Record<string, string>

interface GetLeafsReturn {
  leafVersionsByCanonical: LeafVersionsByUrl
  leafValueSets: fhir4.ValueSet[]
  totalLeafs: number
}

const getLeafValueSets = async ({
  allGrouperVSets,
  titleToFind,
  stewardToFind,
  versionToFind,
  oidToFind,
  provisionalOnly
}: GetLeafs): Promise<GetLeafsReturn | ErrorRes> => {
  const leafValueSetCanonicals: string[] = []
  allGrouperVSets.forEach((grouperVs) => {
    const leafUrlsInGrouper = getLeafUrlsFromGrouper(grouperVs) as string[]
    // add groups to the leaf URLs
    leafUrlsInGrouper?.forEach((url) => {
      if (!url || leafValueSetCanonicals?.includes(url)) return

      leafValueSetCanonicals.push(url)
    })
  })
  if (!leafValueSetCanonicals.length) {
      return ({
        leafValueSets: [],
        leafVersionsByCanonical: {},
        totalLeafs: 0
    })
  }

  const leafValueSets = await fetchLeafValueSets({
    leafValueSetCanonicals,
    titleToFind,
    stewardToFind,
    versionToFind,
    oidToFind,
    whitelistFields: WHITELIST_VALUESET_FIELDS,
    provisionalOnly
  })

  if (!leafValueSets?.length) {
    return { error: 'Could not fetch Leaf Valuesets' }
  }

  const leafVersionsByCanonical = leafValueSetCanonicals
    ?.filter((canonical) => canonical?.includes('|'))
    ?.reduce((acc, can) => {
      let [baseCanonical, version] = can.split('|')
      return { ...acc, [baseCanonical]: version }
    }, {})

  const result = {
    leafValueSets,
    leafVersionsByCanonical,
    totalLeafs: leafValueSetCanonicals.length
  }

  return result
}

type GroupsByCanonical = Record<string, Group[]>

const arrangeGroupInfoByValueSetCanonical = (allGrouperVSets: fhir4.ValueSet[]) => {
  const groupsByValueSetCanonical: GroupsByCanonical = {}
  allGrouperVSets.forEach((grouperVs) => {
    const leafUrlsInGrouper = getLeafUrlsFromGrouper(grouperVs) as string[]

    leafUrlsInGrouper?.forEach((leafUrl) => {
      if (!leafUrl) return
      // arrange by unversioned grouper url
      const [urlNoVersion, version] = leafUrl.split('|')

      const groupToAdd = {
        id: grouperVs?.id || 'Undefined',
        url: grouperVs?.url || 'Undefined',
        defaultValueSetVersion: version,
        title: grouperVs.title || ''
      }

      if (groupsByValueSetCanonical[urlNoVersion]) {
        groupsByValueSetCanonical[urlNoVersion].push(groupToAdd)
      } else {
        groupsByValueSetCanonical[urlNoVersion] = [groupToAdd]
      }
    })
  })
  return groupsByValueSetCanonical
}

interface VsInReqGrp {
  groupsVsBelongsTo: Group[]
  groupIdsToFilterBy: string[] | undefined
}

const vsInRequiredGroup = ({ groupsVsBelongsTo, groupIdsToFilterBy }: VsInReqGrp): boolean => {
  // if no group filters active, valueset is allowed by default
  if (!groupIdsToFilterBy) return true
  // if only one filter selected
  if (groupIdsToFilterBy?.length === 1) {
    // do the vs groups include the filtered group
    return !!groupsVsBelongsTo?.find((g) => groupIdsToFilterBy?.includes(g?.id))
  }
  // if there's more than 1 group, the valuesets must match ALL active group filters
  // this is an AND (not 'or') operation
  return groupIdsToFilterBy?.every((id: string) => groupsVsBelongsTo?.find((g) => g?.id === id))
}

interface VsHasCondition {
  valueSet: fhir4.ValueSet
  conditionCodesToFilterBy: string[] | undefined
}

const vsHasRequiredCondition = ({ valueSet, conditionCodesToFilterBy }: VsHasCondition): boolean => {
  const useContextConditions = valueSet?.useContext?.filter(
    (i) => i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type')
  )

  // if no filters active, the result is allowed by default
  if (!conditionCodesToFilterBy) return true
  // if only one filter selected
  if (conditionCodesToFilterBy.length == 1) {
    const matches = useContextConditions?.find((item) =>
      conditionCodesToFilterBy?.includes(item?.valueCodeableConcept?.coding?.[0]?.code as string)
    )
    return Boolean(matches)
  }
  // if more than 1 condition, valuesets must match all condition filters
  return conditionCodesToFilterBy?.every((code: string) =>
    useContextConditions?.find((c) => c?.valueCodeableConcept?.coding?.[0]?.code === code)
  )
}

const formatValuesetData = (
  program: fhir4.Library,
  groupsByValueSetCanonical: GroupsByCanonical,
  leafValueSets: fhir4.ValueSet[],
  leafVersionsByCanonical: LeafVersionsByUrl
) => {
  const formattedVsets = leafValueSets
    .filter((x) => !!x)
    .map((valueSet, index) => {
      const leafCanonical = valueSet.url!
      const groupsVsBelongsTo = groupsByValueSetCanonical[leafCanonical]
      const valueSetPinnedVersion = leafVersionsByCanonical[leafCanonical]

      return {
        keyField: `${valueSet.url}-${valueSet.version}-${index}`,
        programName: program?.name || 'Undefined',
        programId: program?.id || 'Undefined',
        programStatus: program?.status || 'Unknown', // I don't think really need these program values as most routes start with retrieving a program
        title: valueSet?.name || 'Undefined',
        canonical: valueSet?.url || 'Undefined',
        version: valueSet?.version || '',
        valueSetPinnedVersion,
        valueSet: valueSet,
        groups: groupsVsBelongsTo
      }
    })
  return formattedVsets
}

const isError = (res: any): res is ErrorRes => {
  return typeof (res as ErrorRes).error === 'string'
}

// ------------------------------------------------------------------------------------------------
// ------------------------API ROUTE BEGINS HERE---------------------------------------------------
// ------------------------------------------------------------------------------------------------
type ExtendedReq = NextApiRequest & {
  query: {
    id: string
    findInOid?: string
    findInVsTitle?: string
    findInSteward?: string
    findInVersion?: string
    groups?: string
    conditions?: string
    provisionalOnly?: boolean
  }
}

type RequestQueryParams = {
  id: string
  findInOid?: string
  findInVsTitle?: string
  findInSteward?: string
  findInVersion?: string
  groups?: string
  conditions?: string
  provisionalOnly?: boolean
}

// TODO: maybe move this out of the route?
export const getProgramDetailsValuesets = async ({
  id: programId,
  findInOid,
  findInSteward,
  findInVersion,
  findInVsTitle,
  groups,
  conditions,
  provisionalOnly
}: RequestQueryParams) => {
  try {
    const program = await getProgram(programId)

    if (isError(program)) {
      logger.error(`Problem encountered getting program with ID ${programId}`)
      return { status: 400, payload: { error: program.error } }
    }

    const grouperLibrary = await getGrouperLibrary(program)

    if (isError(grouperLibrary)) {
      logger.error(`Problem encountered getting grouper library for Program ${programId}`)
      return { status: 400, payload: { error: grouperLibrary.error } }
    }

    const grouperValueSets = await getGrouperValuesets(grouperLibrary)

    if (!Array.isArray(grouperValueSets) && isError(grouperValueSets)) {
      logger.error(`Problem encountered getting grouper valuesets for Program ${programId}`)
      return { status: 400, payload: { error: grouperValueSets.error } }
    }

    // filters here (<x>.toFind strings) are applied on the server side
    const leafVsetResponse = await getLeafValueSets({
      allGrouperVSets: grouperValueSets,
      oidToFind: findInOid || '',
      stewardToFind: findInSteward || '',
      versionToFind: findInVersion || '',
      titleToFind: findInVsTitle || '',
      provisionalOnly: Boolean(provisionalOnly)
    })

    if (isError(leafVsetResponse)) {
      logger.error(`Problem encountered getting leaf valuesets for Program ${programId}`)
      return { status: 400, payload: { error: leafVsetResponse.error } }
    }

    const { leafValueSets, leafVersionsByCanonical, totalLeafs } = leafVsetResponse

    const groupInfoByVsCanonical = arrangeGroupInfoByValueSetCanonical(grouperValueSets)

    // these filters are performed here
    const filterGroups = groups?.split(',')
    const filterConditions = conditions?.split(',')

    // limit leafs to only those
    const filteredLeafVSets = leafValueSets
      .filter(
        (vs) =>
          !!vs &&
          // vs canonical has version on it?
          vsInRequiredGroup({
            groupsVsBelongsTo: groupInfoByVsCanonical[vs.url!],
            groupIdsToFilterBy: filterGroups
          }) &&
          vsHasRequiredCondition({ valueSet: vs, conditionCodesToFilterBy: filterConditions })
      )
      .filter((x) => !!x)
    const formattedVsets = formatValuesetData(program, groupInfoByVsCanonical, filteredLeafVSets, leafVersionsByCanonical)

    const composedResponse = {
      data: formattedVsets,
      groupsInProgram: grouperValueSets,
      totalLeafs
    }
    return { status: 200, payload: composedResponse }
  } catch (e: any) {
    logger.error(`error:  , ${JSON.stringify(e, null, 2)}`)
    return { status: 400, payload: { error: 'Search for leaf valueset details failed.' } }
  }
}

const getProgramDetailsValuesetsController = async (req: ExtendedReq, res: NextApiResponse<Result | { error: string }>) => {
  const { status, payload } = await getProgramDetailsValuesets(req.query as unknown as RequestQueryParams)
  res.status(status).json(payload)
}

export default handler({
  GET: { action: getProgramDetailsValuesetsController }
})
