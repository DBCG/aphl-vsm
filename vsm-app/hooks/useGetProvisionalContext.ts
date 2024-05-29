import { ProvisionalsByProgram } from '@/pages/api/programs/provisional'
import { useState, useEffect } from 'react'

interface ReturnItems {
  provisionalContext: ProvisionalsByProgram | { error: string }
  isContextLoading: boolean
}

const useGetProvisionalContext = (): ReturnItems => {
  const [provisionalContext, setProvisionalContext] = useState<ProvisionalsByProgram | { error: string }>([])
  const [isContextLoading, setIsContextLoading] = useState(false)
  useEffect(() => {
    setIsContextLoading(true)
    async function getProvisionalContext(): Promise<void> {
        let endpoint = '/api/programs/provisional'
        try {
          const response: Response = await fetch(endpoint)
          if (!response.ok) {
            // send error back here for FE eventually
            console.error('Error occurred while searching Provisional Context')
            setProvisionalContext({error: 'Error Occurred' })
          } else {
            const json = await response.json()
            if ('error' in json) {
              // better handle error here
              console.error(json)
              setProvisionalContext({ error: 'Error occurred' })
            } else {
              setProvisionalContext(json)
            }
          }
        } catch (e) {
          console.error(e)
          setProvisionalContext({ error: 'Error occurred' })
        }
        setIsContextLoading(false)
    }
    void getProvisionalContext()
  }, [])

  return ({ provisionalContext, isContextLoading })
}

export { useGetProvisionalContext }
