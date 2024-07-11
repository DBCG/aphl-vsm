import { useState, useEffect } from 'react'

interface Props {
  systemUrl: undefined | fhir4.CodeSystem['url']
}

interface ProvCsReturn {
  provisionalCS: fhir4.CodeSystem[] | undefined
  isCsLoading: boolean
}

const useGetProvisionalCS = (props?: Props): ProvCsReturn => {
  const [provisionalCS, setProvisionalCS] = useState<fhir4.CodeSystem[]>([])
  const [isCsLoading, setIsCsLoading] = useState(false)
  useEffect(() => {
    setIsCsLoading(true)
    async function getProvisionalCS(): Promise<void> {
      console.log('this called 123')
      let endpoint = '/api/codesystem/provisional'
      // if system url isn't defined, endpoint returns all provisional CS
      if (props?.systemUrl) {
        endpoint = endpoint + `?systemUrl=${props.systemUrl}`
      }
      try {
        const response: Response = await fetch(endpoint)
        if (!response.ok) {
          // send error back here for FE eventually
          console.error('Error occurred while searching Provisional CodeSystems')
          setProvisionalCS([])
        } else {
          const json = await response.json()
          if ('error' in json) {
            // better handle error here
            console.error(json)
            setProvisionalCS([])
          } else {
            setProvisionalCS(json)
          }
        }
      } catch (e) {
        console.error(e)
        setProvisionalCS([])
      }
      setIsCsLoading(false)
    }
    void getProvisionalCS()
  }, [props?.systemUrl])

  return ({ provisionalCS, isCsLoading })
}

export { useGetProvisionalCS }
