import { ConditionsAPIResponse } from '@/pages/api/conditions'
import { useState, useEffect } from 'react'

const useGetConditions = (): fhir4.ValueSetComposeInclude[] => {
  const [conditions, setConditions] = useState<fhir4.ValueSetComposeInclude[]>([])
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending'>('idle')

  useEffect(() => {
    async function getConditions(): Promise<void> {
      let endpoint = '/api/conditions'

      try {
        setRequestStatus('pending')
        const response: Response = await fetch(endpoint)
        const json = await response.json() as ConditionsAPIResponse
        if ('error' in json) {
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
  return conditions
}

export { useGetConditions }
