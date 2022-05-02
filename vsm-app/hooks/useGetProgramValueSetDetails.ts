import { useState, useEffect } from 'react'

// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = (id: string, findInVsName: string) => {
  const [data, setData] = useState([])

  useEffect(() => {
    async function getData(): Promise<void> {
      if (!id) {
        setData([])
        return
      }
      let endpoint = `/api/programs/${id}/details/valuesets`
      if (findInVsName.length) {
        endpoint = endpoint.concat(`?findInVsName=${encodeURIComponent(findInVsName)}`)
      }

      try {
        const response: Response = await fetch(endpoint)
        const programJson = await response.json()
        if (!programJson.error) {
          setData(programJson)
        } else {
          console.error(programJson.error)
        }
      } catch (e) {
        console.error('error: ', e)
      }
    }
    void getData()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, findInVsName])
  return data
}

export { useGetProgramValueSetDetails }