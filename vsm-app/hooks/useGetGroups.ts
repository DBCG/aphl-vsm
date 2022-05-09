import { useState, useEffect } from 'react'

const useGetGroups = (programId: string): [] | fhir4.Library[] => {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    async function getConditions(): Promise<void> {
      let endpoint = `/api/programs/${programId}/`

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
        console.log('Error in useGetGroups: ', e)
      }
    }
    void getConditions()
  }, [])

  return groups
}

export { useGetGroups }