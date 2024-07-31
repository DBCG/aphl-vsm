import { fetcher } from '@/utils'
import useSWR, { KeyedMutator } from 'swr'

interface Group {
  label: string
  value: string
}

interface GroupItem {
  url: string
  id: string
  title: string
}

interface ConditionItem {
  label: string
  value: {
    system: string
    code: string
    text: string
    version: string
  }
}

export interface DataItem {
  canonical: string
  programName: string
  programId: string
  groups: GroupItem[]
  title: string
  publisher: string
  version: string
  valueSet: fhir4.ValueSet
  programStatus: fhir4.Library['status']
}

export interface Result {
  data?: DataItem[]
  refreshProgramValueSets: KeyedMutator<any>
  totalLeafs?: number
  groupsInProgram?: fhir4.ValueSet[]
  programStatus?: fhir4.Library['status']
}

interface Args {
  id: string
  findInVsTitle?: string
  findInVersion?: string
  findInPublisher?: string
  findInOid?: string
  activePriority?: string[]
  valueSetPriorityMap?: Record<string, string>
  conditionsMap?: Record<string, { id: string }[]>
  activeGroups?: Group[]
  activeConditions?: ConditionItem[]
  updatedGrouperValueSets?: fhir4.ValueSet[]
  updatedGrouper?: fhir4.Library
  versionToUpdate?: string
  toggleUpdateData?: boolean
  provisionalOnly?: boolean
}
// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = ({
  id,
  findInVsTitle,
  findInOid,
  findInVersion,
  findInPublisher,
  activeGroups,
  activeConditions,
  activePriority,
  valueSetPriorityMap = {},
  conditionsMap = {},
  updatedGrouperValueSets,
  provisionalOnly
}: Args): Result => {
  let endpoint = `/api/programs/${id}/details/valuesets`
  let queries = []

  if (findInVsTitle?.length) {
    queries.push(`findInVsTitle=${encodeURIComponent(findInVsTitle)}`)
  }

  if (findInVersion?.length) {
    queries.push(`findInVersion=${encodeURIComponent(findInVersion)}`)
  }

  if (findInOid?.length) {
    queries.push(`findInOid=${encodeURIComponent(findInOid)}`)
  }

  if (findInPublisher?.length) {
    queries.push(`findInPublisher=${encodeURIComponent(findInPublisher)}`)
  }

  if (activeGroups?.length) {
    const canonicals = activeGroups.map((g) => g.value)
    const result = canonicals.join(',')
    queries.push(`groups=${encodeURIComponent(result)}`)
  }

  if (updatedGrouperValueSets?.length) {
    queries.push('useCache=false')
  }

  if (provisionalOnly === true) {
    queries.push('useCache=false')
  }

  queries.forEach((queryItem, idx) => {
    if (idx == 0) {
      endpoint = endpoint.concat(`?${queryItem}`)
    } else {
      endpoint = endpoint.concat(`&${queryItem}`)
    }
  })

  const { data, mutate, isLoading } = useSWR(id != null ? endpoint : null, fetcher)

  if (!data || isLoading) {
    return {refreshProgramValueSets: mutate} as Result // Workaround typescript issue, needs to be refactored
  }

  if (activePriority && activePriority?.length > 0) {
    const filteredData = data?.data?.filter((vs: DataItem) => {
      if (!vs.valueSet.url) {
        return false
      }
      const currentPriority = valueSetPriorityMap[vs.valueSet.url]
      return activePriority?.includes('routine') && currentPriority !== 'emergent' ? true : activePriority?.includes(currentPriority)
    })
    data.data = filteredData
  }

  if (activeConditions && activeConditions?.length > 0) {
    const activeConditionsMap = activeConditions.map((i) => i.value.system + '|' + i.value.code)
    const filteredConditionData = data?.data?.filter((vs: DataItem) => {
      if (!vs.valueSet.url) {
        return false
      }
      const currentConditions = conditionsMap[vs.valueSet.url]?.map((i) => i?.id)
      // Test for intersection of either array
      return currentConditions?.filter((value) => activeConditionsMap.includes(value)).length > 0
    })

    data.data = filteredConditionData
  }

  return data as Result
}

export { useGetProgramValueSetDetails }
