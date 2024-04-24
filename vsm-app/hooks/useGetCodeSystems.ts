import { useState, useEffect } from 'react'

interface Props {
  systemUrl: undefined | fhir4.CodeSystem['url']
}

const useGetCS = (refresh): [] | fhir4.CodeSystem[] => {
  const [codeSystems, setCodeSystems] = useState<fhir4.CodeSystem[]>([])
  console.log('this runs')
  useEffect(() => {
    async function getCS(): Promise<void> {

        let endpoint = '/api/codesystem'
        // if system url isn't defined, endpoint returns all provisional CS
        // if (props?.systemUrl) {
        //   endpoint = endpoint + `?systemUrl=${props.systemUrl}`
        // }
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
  console.log('codesystems: ', codeSystems)
  return codeSystems
}

export { useGetCS }