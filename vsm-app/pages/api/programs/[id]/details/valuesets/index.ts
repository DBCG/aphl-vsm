import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { Result } from '@/hooks/useGetProgramValueSetDetails'
import { fetchLeafValueSets } from '@/helpers/server/serverValueSetHelper'
import Logger from '@/helpers/server/logger'
import { getProgram, getGrouperLibrary, getGrouperValuesets } from '@/helpers/server/serverLibraryHelper'
import { getLeafUrlsFromGrouper } from '@/helpers/valueSetHelpers'
import { uniq } from 'lodash'

// Items in the table
interface Group {
  id: string
  title: string
  url: string
  defaultValueSetVersion?: string
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
  // 'compose'
]
// ------------------------------------------------------------------------------------------------
// ------------------------HELPER FUNCTIONS FOR ROUTE----------------------------------------------
// ------------------------------------------------------------------------------------------------

type LeafVersionsByUrl = Record<string, string>
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
        programName: program?.name || '[Undefined]',
        programId: program?.id || '[Undefined]',
        programStatus: program?.status || '[Undefined]', // I don't think really need these program values as most routes start with retrieving a program
        title: valueSet?.title || '[Undefined]',
        name: valueSet?.name || '[Undefined]',
        canonical: valueSet?.url || '[Undefined]',
        publisher: valueSet?.publisher || '[Undefined]',
        version: valueSet?.version || '[Undefined]',
        valueSetPinnedVersion,
        valueSet: valueSet,
        groups: groupsVsBelongsTo
      }
    })
  return formattedVsets
}

// ------------------------------------------------------------------------------------------------
// ------------------------API ROUTE BEGINS HERE---------------------------------------------------
// ------------------------------------------------------------------------------------------------
type ExtendedReq = NextApiRequest & {
  query: {
    id?: string
    findInOid?: string
    findInVsTitle?: string
    findInSteward?: string
    findInPublisher?: string
    findInVersion?: string
    groups?: string
    conditions?: string
  }
}

type RequestQueryParams = {
  id: string
  findInOid?: string
  findInVsTitle?: string
  findInSteward?: string
  findInPublisher?: string
  findInVersion?: string
  groups?: string
  conditions?: string
}

// TODO: maybe move this out of the route?
export const getProgramDetailsValuesets = async ({
  id: programId,
  findInOid,
  findInSteward,
  findInPublisher,
  findInVersion,
  findInVsTitle,
  groups,
}: RequestQueryParams) => {
  try {
    const program = await getProgram(programId)
    const grouperLibrary = await getGrouperLibrary(program)
    const grouperValueSets = await getGrouperValuesets(grouperLibrary)
    // @ts-ignore
    const leafValueSetCanonicals = uniq(grouperValueSets.reduce((acc, i) => [...acc, ...getLeafUrlsFromGrouper(i)], [])) as string[]

    const leafValueSets = (await fetchLeafValueSets({
      leafValueSetCanonicals,
      oidToFind: findInOid || '',
      stewardToFind: findInSteward || '',
      publisherToFind: findInPublisher || '',
      versionToFind: findInVersion || '',
      titleToFind: findInVsTitle || '',
      whitelistFields: WHITELIST_VALUESET_FIELDS,
      provisionalOnly: false
    })) as fhir4.ValueSet[]

    const leafVersionsByCanonical = leafValueSetCanonicals
      ?.filter((canonical) => canonical?.includes('|'))
      ?.reduce((acc, can) => {
        let [baseCanonical, version] = can.split('|')
        return { ...acc, [baseCanonical]: version }
      }, {})

    const groupInfoByVsCanonical = arrangeGroupInfoByValueSetCanonical(grouperValueSets)

    // these filters are performed here
    const filterGroups = groups?.split(',')

    // limit leafs to only those
    const filteredLeafVSets = leafValueSets
      .filter(
        (vs) =>
          !!vs &&
          // vs canonical has version on it?
          vsInRequiredGroup({
            groupsVsBelongsTo: groupInfoByVsCanonical[vs.url!],
            groupIdsToFilterBy: filterGroups
          })
      )
      .filter((x) => !!x)
    const formattedVsets = formatValuesetData(program, groupInfoByVsCanonical, filteredLeafVSets, leafVersionsByCanonical)

    const composedResponse = {
      data: formattedVsets,
      groupsInProgram: grouperValueSets,
      totalLeafs: leafValueSets.length
    }
    return { status: 200, payload: composedResponse }
  } catch (e: any) {
    Logger.getLogger().error(`error:  , ${JSON.stringify(e, null, 2)}`)
    const error = `Search for leaf valueset details failed: ${e?.message}`
    return { status: 400, payload: { error } }
  }
}

const getProgramDetailsValuesetsController = async (req: ExtendedReq, res: NextApiResponse<Result | { error: string }>) => {
  const { status, payload } = await getProgramDetailsValuesets(req.query as unknown as RequestQueryParams)
  res.status(status).json(payload)
}

export default handler({
  GET: { action: getProgramDetailsValuesetsController }
})
