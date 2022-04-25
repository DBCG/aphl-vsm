import { useState, useEffect } from 'react'

// gets data necessary to build the program valueset details page
const useGetProgramValueSetDetails = (id: string) => {
  const [data, setData] = useState([])

  useEffect(() => {
    async function getData(): Promise<void> {
      if (!id) {
        setData([])
        return
      }
      const endpoint = `/api/programs/${id}/details/valuesets`

      try {
        const response: Response = await fetch(endpoint)
        const programJson = await response.json()
        setData(programJson)
      } catch (e) {
        console.log('error: ', e)
      }
    }
    void getData()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return data
}

export { useGetProgramValueSetDetails }