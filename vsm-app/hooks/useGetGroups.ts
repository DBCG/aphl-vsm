import { useState, useEffect } from 'react'

interface GroupArgs {
  programId: string
  refreshToggle?: Boolean
}

interface GroupsResponse {
  groups: fhir4.ValueSet[]
  groupsError: string | null
  groupsLoading: boolean
}

const useGetGroups = ({ programId, refreshToggle }: GroupArgs): GroupsResponse => {
  const [groups, setGroups] = useState([])
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(false)

  useEffect(() => {
    setGroupsLoading(true)
    async function getGroups(): Promise<void> {
      if (!programId) {
        setGroupsError(`No program with ID ${programId} found`)
      } else {
        let endpoint = `/api/programs/${programId}/details/valuesets/groups`
        try {
          const response: Response = await fetch(endpoint)
          const json = await response.json()
          if (json.error) {
            console.error(json.error)
            setGroupsError(`Could not find groups for program with id ${programId}`)
          } else {
            setGroups(json)
          }
        } catch (e) {
          setGroups([])
          setGroupsError('Error attempting to find groups')
        }
      }
      setGroupsLoading(false)
    }
    void getGroups()
  }, [programId, refreshToggle])

  return { groups, groupsError, groupsLoading }
}

export { useGetGroups }
