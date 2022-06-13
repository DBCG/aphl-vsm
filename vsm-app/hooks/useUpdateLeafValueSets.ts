import { useState, useEffect } from 'react'

const useUpdateLeafValueSets = (
  programId: string,
  selectedValueSets: fhir4.ValueSet[],
  selectedConditions: any,
  selectedGroups: any
): [] | fhir4.ValueSet[] => {
  const [leafVSets, setLeafVSets] = useState([])

  useEffect(() => {
    async function updateLeafVSets(): Promise<void> {
      if (!programId) {
        return
      }
      // this actually doesn't have to be under programId...
      let endpoint = `/api/programs/${programId}/details/valuesets`

      try {
        const response: Response = await fetch(endpoint, {
          method: 'PUT',
          body: {
            // @ts-ignore-next
            valueSetsToUpdate: selectedValueSets,
            conditionsToAdd: selectedConditions,
            groupsToUpdate: selectedGroups
          }
        })
        const json = await response.json()
        if (json.error) {
          console.error(json.error)
          setLeafVSets([])
        } else {
          setLeafVSets(json)
        }
      } catch (e) {
        setLeafVSets([])
        console.error('Error in useGetGroups: ', e)
      }
    }
    void updateLeafVSets()
  }, [programId])

  return leafVSets
}

export { useUpdateLeafValueSets }