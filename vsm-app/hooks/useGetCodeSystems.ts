import { useState, useEffect } from 'react'

interface ReturnedData {
  uri: string
  name: string
}

const useGetCS = (refresh: HTMLElement | null): ReturnedData[] => {
  const [codeSystems, setCodeSystems] = useState<ReturnedData[]>([])
  useEffect(() => {
    async function getCS(): Promise<void> {

        let endpoint = '/api/codesystem'
        try {
          const response: Response = await fetch(endpoint)
          const json = await response.json()
          if (!response.ok) {
            // send error back here for FE eventually
            console.error('Error occurred while searching VSAC CodeSystems')
            setCodeSystems([])
          } else {
            if ('error' in json) {
              // better handle error here
              console.error(json)
              setCodeSystems([])
            } else {
              setCodeSystems(json)
            }
          }
        } catch (e) {
          console.error(e)
          setCodeSystems([])
        }
    }
    void getCS()
  }, [refresh])
  return codeSystems
}

export { useGetCS }