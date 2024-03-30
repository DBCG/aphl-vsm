import { useState, useEffect } from 'react'

interface Props {
  systemUrl: undefined | fhir4.CodeSystem['url']
}

const useGetProvisionalCS = (props: Props): [] | fhir4.CodeSystem[] => {
  const [codeSystems, setCodeSystems] = useState<fhir4.CodeSystem[]>([])
  useEffect(() => {
    async function getProvisionalCS(): Promise<void> {

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
            setCodeSystems([])
          } else {
            const json = await response.json()
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
    void getProvisionalCS()
  }, [props.systemUrl])

  return codeSystems
}

export { useGetProvisionalCS }
