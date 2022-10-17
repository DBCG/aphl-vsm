import { useState, useEffect } from 'react'

export interface SearchFilters {
  id?: string,
  name?: string,
  title?: string,
  description?: string,
  newProgram?: string | undefined,
}

const buildQuery = (args: any): string => {
  if (!args) return ''
  let query = []
  const strMatch = /id|name|title|description/
  for (const arg in args) {
    if (arg.match(strMatch) && `${args[arg]}` !== '') {
      query.push(`${arg}=${encodeURIComponent(args[arg])}`)
    }
  }
  return query.join('&')
}

const useGetPrograms = (fields: SearchFilters): [] | fhir4.Library[] => {
  const [libraries, setLibraries] = useState([])
  const { id, name, title, description, newProgram } = fields
  useEffect(() => {
    async function getPrograms(): Promise<void> {
      let endpoint = '/api/programs'
      const query = buildQuery(fields)
      if (query.length) {
        endpoint = endpoint.concat('?', query)
      }
      try {
        const response: Response = await fetch(endpoint)
        const json = await response.json()
        if (json.error) {
          setLibraries([])
        } else {
          setLibraries(json)
        }
      } catch (e) {
        setLibraries([])
        console.error('Error in useGetPrograms: ', e)
      }
    }
    void getPrograms()
    // disabled b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, title, description, newProgram])

  return libraries
}

export { useGetPrograms }