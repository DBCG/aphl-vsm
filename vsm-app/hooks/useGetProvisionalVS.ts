import { useState, useEffect } from 'react'


const useGetProvisionalVS = (): [] | fhir4.ValueSet[] => {
  const [vsets, setVsets] = useState<fhir4.ValueSet[]>([])
  useEffect(() => {
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
      
    }
    void getProvisionalVS()
  }, [])

  return vsets
}

export { useGetProvisionalVS }
