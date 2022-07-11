import { useState, useEffect } from 'react'

export interface SearchFilters {
  id?: string,
  name?: string,
  title?: string,
  description?: string,
  version?: string,
}

const buildQuery = (args: any): string => {
  if (!args) return ''
  let query = []
  const strMatch = /id|name|title|description|version/
  for (const arg in args) {
    if (arg.match(strMatch) && `${args[arg]}` !== '') {
      query.push(`${arg}=${encodeURIComponent(args[arg])}`)
    }
  }
  return query.join('&')
}

const useGetPrograms = (fields: SearchFilters): [] | fhir4.Library[] => {
  const [libraries, setLibraries] = useState([])

  const { id, name, title, description, version } = fields
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

  }, [id, name, title, description, version])

  return libraries
}

export { useGetPrograms }