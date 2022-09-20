import { useState, useEffect } from 'react'

// value is the grouper canonical
interface Group {
  label: string,
  value: string
}

interface GroupItem {
  url: string,
  id: string,
  title: string
}

interface ConditionItem {
  label: string,
  value: {
    system: string,
    code: string,
    text: string,
    version: string
  }
}

export interface DataItem {
  canonical: string,
  programName: string,
  programId: string,
  groups: GroupItem[],
  title: string,
  version: string,
  valueSet: fhir4.ValueSet
}

interface Result {
  data: DataItem,
  groupsInProgram: fhir4.ValueSet[]
}

// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = (
  id: string,
  findInVsName: string,
  findInVersion: string,
  findInSteward: string,
  activeGroups: [] | Group[],
  activeConditions: [] | ConditionItem[],
  updatedValueSet: fhir4.ValueSet | undefined,
  updatedGrouperValueSets: [] | fhir4.ValueSet[]
): Result | {} => {
  const [data, setData] = useState<{} | Result>({})
  useEffect(() => {
    async function getData(): Promise<void> {
      if (!id) {
        setData({})
        return
      }

      let endpoint = `/api/programs/${id}/details/valuesets`
      let queries = []

      if (findInVsName.length) {
        queries.push(`findInVsName=${encodeURIComponent(findInVsName)}`)
      }

      if (findInVersion.length) {
        queries.push(`findInVersion=${encodeURIComponent(findInVersion)}`)
      }

      if (findInSteward.length) {
        queries.push(`findInSteward=${encodeURIComponent(findInSteward)}`)
      }

      if (activeGroups.length) {
        const canonicals = activeGroups.map(g => g.value)
        const result = canonicals.join(',')
        queries.push(`groups=${encodeURIComponent(result)}`)
      }

      if (activeConditions.length) {
        const codes = activeConditions.map(g => g.value.code)
        const result = codes.join(',')
        queries.push(`conditions=${encodeURIComponent(result)}`)
      }

      if (updatedGrouperValueSets.length) {
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
        // handle error better
        setData({})
      }
    }

    void getData()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    findInVsName,
    findInVersion,
    findInSteward,
    activeGroups,
    activeConditions,
    updatedValueSet,
    updatedGrouperValueSets
  ])

  return data
}

export { useGetProgramValueSetDetails }