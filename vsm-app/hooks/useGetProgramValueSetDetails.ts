import { useState, useEffect } from 'react'

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
  version: string
  valueSet: fhir4.ValueSet
  programStatus: fhir4.Library['status']
}

export interface Result {
  data?: DataItem[]
  totalLeafs?: number
  groupsInProgram?: fhir4.ValueSet[]
  programStatus?: fhir4.Library['status']
}

interface Args {
  id: string
  findInVsTitle?: string
  findInVersion?: string
  findInOid?: string
  findInSteward?: string
  activePriority?: string[]
  valueSetPriorityMap?: Record<string, string>
  conditionsMap?: Record<string, {id: string}[]>
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
  findInSteward,
  activeGroups,
  activeConditions,
  activePriority,
  valueSetPriorityMap = {},
  conditionsMap = {},
  updatedGrouperValueSets,
  updatedGrouper,
  versionToUpdate,
  toggleUpdateData,
  provisionalOnly,
}: Args): Result | {} => {
  const [data, setData] = useState<Result>({})
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending'>('idle')

  useEffect(() => {
    async function getData(): Promise<void> {
      if (!id) {
        setData({})
        return
      }

      let endpoint = `/api/programs/${id}/details/valuesets`
      let queries = []

      if (findInVsTitle?.length) {
        queries.push(`findInVsTitle=${encodeURIComponent(findInVsTitle)}`)
      }

      if (findInVersion?.length) {
        queries.push(`findInVersion=${encodeURIComponent(findInVersion)}`)
      }

      if (findInSteward?.length) {
        queries.push(`findInSteward=${encodeURIComponent(findInSteward)}`)
      }

      if (findInOid?.length) {
        queries.push(`findInOid=${encodeURIComponent(findInOid)}`)
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

      try {
        setRequestStatus('pending')
        const response: Response = await fetch(endpoint)
        const programJson = await response.json()
        if (!programJson.error) {
          setData(programJson)
        } else {
          console.error(programJson.error)
          // handle error better
          setData({})
        }
      } catch (e) {
        console.error('error: ', e)
        //TODO: handle error better
        setData({})
      } finally {
        setRequestStatus('idle')
      }
    }

    if (requestStatus === 'idle') {
      getData()
    }
  }, [
    id,
    findInVsTitle,
    findInVersion,
    findInSteward,
    findInOid,
    activeGroups,
    activeConditions,
    activePriority,
    updatedGrouperValueSets,
    updatedGrouper,
    versionToUpdate,
    toggleUpdateData
  ])

  if (activePriority && activePriority?.length > 0) {
    const filteredData = data?.data
      ?.filter((vs) => {
        if (!vs.valueSet.url) {
          return false
        }
        const currentPriority = valueSetPriorityMap[vs.valueSet.url]
        return activePriority?.includes('routine') && currentPriority !== 'emergent' ? true : activePriority?.includes(currentPriority)
      })
    data.data = filteredData
  }

  if (activeConditions && activeConditions?.length > 0) {
    const activeConditionsMap = activeConditions.map(i => i.value.system + '|' + i.value.code)
    const filteredConditionData = data?.data?.filter((vs) => {
      if (!vs.valueSet.url) {
        return false
      }
      const currentConditions = conditionsMap[vs.valueSet.url]?.map((i) => i?.id)
      // Test for intersection of either array
      return currentConditions?.filter(value => activeConditionsMap.includes(value)).length > 0;
    })

    data.data = filteredConditionData
  }

  return data
}

export { useGetProgramValueSetDetails }
