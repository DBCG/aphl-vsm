import { useState, useEffect } from 'react'

interface GroupArgs {
  programId: string
  refreshToggle?: Boolean
}

const useGetGroups = ({ programId, refreshToggle }: GroupArgs): [] | fhir4.ValueSet[] => {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    async function getGroups(): Promise<void> {
      if (!programId) {
        return
      }
      let endpoint = `/api/programs/${programId}/details/valuesets/groups`
      try {
        const response: Response = await fetch(endpoint)
        const json = await response.json()
        if (json.error) {
          console.error(json.error)
          setGroups([])
        } else {
          setGroups(json)
        }
      } catch (e) {
        setGroups([])
        console.error('Error in useGetGroups: ', e)
      }
    }
    void getGroups()
  }, [programId, refreshToggle])

  return groups
}

export { useGetGroups }
