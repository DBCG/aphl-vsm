import { useState, useEffect } from 'react'

// value is the grouper canonical
interface Group {
  label: string,
  value: string
}

interface GroupItem {
  id: string,
  title: string
}

export interface DataItem {
  programName: string,
  programId: string,
  conditions: [],
  groups: GroupItem[],
  title: string,
  version: string
}

interface Result {
  data: DataItem,
  groupsInProgram: fhir4.ValueSet[]
}

// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = (id: string, findInVsName: string, activeGroups: [] | Group[]): Result | {} => {
  const [data, setData] = useState({})

  useEffect(() => {
    async function getData(): Promise<void> {
      if (!id) {
        setData([])
        return
      }
      let endpoint = `/api/programs/${id}/details/valuesets`
      if (findInVsName.length) {
        endpoint = endpoint.concat(`?findInVsName=${encodeURIComponent(findInVsName)}`)
      }

      if (activeGroups.length) {
        if (findInVsName.length) {
          // add an & only if there are already query parameters to chain to
          endpoint = endpoint.concat('&')
        } else {
          endpoint = endpoint.concat('?')
        }
        const canonicals = activeGroups.map(g => g.value)
        const result = canonicals.join(',')
        endpoint = endpoint.concat(`groups=${encodeURIComponent(result)}`)
      }

      try {
        const response: Response = await fetch(endpoint)
        const programJson = await response.json()
        if (!programJson.error) {
          setData(programJson)
        } else {
          console.error(programJson.error)
        }
      } catch (e) {
        console.error('error: ', e)
      }
    }
    void getData()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, findInVsName, activeGroups])

  return data
}

export { useGetProgramValueSetDetails }