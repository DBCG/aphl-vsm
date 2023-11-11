import { useState, useEffect } from 'react'

const useGetConditions = (): [] | fhir4.ValueSetComposeInclude => {
  const [conditions, setConditions] = useState([])
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending'>('idle')

  useEffect(() => {
    async function getConditions(): Promise<void> {
      let endpoint = '/api/conditions'

      try {
        setRequestStatus('pending')
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
      } finally {
        setRequestStatus('idle')
      }
    }
    if (requestStatus === 'idle') {
      getConditions()
    }
  }, [])
  // @ts-expect-error
  return conditions
}

export { useGetConditions }
