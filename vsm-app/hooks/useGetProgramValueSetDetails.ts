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
}

interface Args {
  id: string
  findInVsTitle?: string
  findInVersion?: string
  findInOid?: string
  findInSteward?: string
  activeGroups?: Group[]
  updatedGrouperValueSets?: fhir4.ValueSet[]
  updatedGrouper?: fhir4.Library
  versionToUpdate?: string
  toggleUpdateData?: boolean
}
// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = ({
  id,
  findInVsTitle,
  findInOid,
  findInVersion,
  findInSteward,
  activeGroups,
  updatedGrouperValueSets,
  updatedGrouper,
  versionToUpdate,
  toggleUpdateData
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
    updatedGrouperValueSets,
    updatedGrouper,
    versionToUpdate,
    toggleUpdateData
  ])

  return data
}

export { useGetProgramValueSetDetails }
