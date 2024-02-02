import { ConditionItem } from '@/helpers/conditionHelpers'
import { ConditionsAPIResponse } from '@/pages/api/conditions'
import { useState, useEffect } from 'react'

const useGetConditions = (): ConditionItem[] => {
  const [conditions, setConditions] = useState<ConditionItem[]>([])
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending'>('idle')

  // get all conditions from RCKMS valueset
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
