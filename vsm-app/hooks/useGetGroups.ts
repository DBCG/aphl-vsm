import { useState, useEffect } from 'react'

const useGetGroups = (programId: string): [] | fhir4.ValueSet[] => {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    async function getGroups(): Promise<void> {
      if (!programId) {
        return
      }
      let endpoint = `/api/programs/${programId}/details/valuesets/groups`
      console.log('programId: ', programId)
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
  }, [programId])

  return groups
}

export { useGetGroups }