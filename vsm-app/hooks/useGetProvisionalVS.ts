import { useState, useEffect } from 'react'

interface ProvVsReturn {
  provisionalVS: fhir4.ValueSet[]
  isVsLoading: boolean
}

const useGetProvisionalVS = (): ProvVsReturn => {
  const [vsets, setVsets] = useState<fhir4.ValueSet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => {
    setIsLoading(true)
    async function getProvisionalVS(): Promise<void> {

        let endpoint = '/api/valueset/provisional'
        // handle queries for reference url eventually
        try {
          const response: Response = await fetch(endpoint)
          if (!response.ok) {
            // send error back here for FE eventually
            console.error('Error occurred while searching Provisional VSets')
            setVsets([])
          } else {
            const json = await response.json()
            if ('error' in json) {
              // better handle error here
              console.error(json)
              setVsets([])
            } else {
              setVsets(json)
            }
          }
        } catch (e) {
          console.error(e)
          setVsets([])
        }
      setIsLoading(false)
    }
    void getProvisionalVS()
  }, [])

  return ({
    provisionalVS: vsets,
    isVsLoading: isLoading
  })
}

export { useGetProvisionalVS }
