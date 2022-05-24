import { useState, useEffect } from 'react'

const useGetConditions = (): [] | fhir4.ValueSetComposeInclude => {
  const [conditions, setConditions] = useState([])

  useEffect(() => {
    async function getConditions(): Promise<void> {
      let endpoint = '/api/conditions'

      try {
        const response: Response = await fetch(endpoint)
        const json = await response.json()
        if (json.error) {
          console.error(json.error)
          setConditions([])
        } else {
          setConditions(json)
        }
      } catch (e) {
        setConditions([])
        console.error('Error in useGetConditions: ', e)
      }
    }
    void getConditions()
  }, [])
  // @ts-expect-error
  return conditions
}

export { useGetConditions }