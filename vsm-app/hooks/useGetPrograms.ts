import { useState, useEffect } from 'react'

const useGetPrograms = (): [] | fhir4.Library[] => {
  const [libraries, setLibraries] = useState([])

  useEffect(() => {
    async function getPrograms(): Promise<void> {
      const response: Response = await fetch('/api/programs')
      const json = await response.json()
      setLibraries(json)
    }
    void getPrograms()
  }, [])

  return libraries
}

export { useGetPrograms }