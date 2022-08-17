import { useState, useEffect } from 'react'

export interface SearchFilters {
  id?: string,
  name?: string,
  title?: string,
  description?: string
  //version?: string,
}

const buildQuery = (args: any): string => {
  if (!args) return ''
  let query = []
  //const strMatch = /id|name|title|description|version/
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

  //const { id, name, title, description, version } = fields
  const { id, name, title, description} = fields
  useEffect(() => {
    async function getPrograms(): Promise<void> {
      let endpoint = '/api/programs'
      const query = buildQuery(fields)
      if (query.length) {
        endpoint = endpoint.concat('?', query)
      }
      try {
        //if(id?.length != 0 && name?.length != 0 && title?.length != 0 && description?.length != 0 && version?.length != 0) {
        if(id?.length != 0 && name?.length != 0 && title?.length != 0 && description?.length != 0) {  
          const response: Response = await fetch(endpoint)
          const json = await response.json()
          if (json.error) {
            setLibraries([])
          } else {
            setLibraries(json)
          }
        }
      } catch (e) {
        setLibraries([])
        console.error('Error in useGetPrograms: ', e)
      }
    }
    void getPrograms()

  }, [id, name, title, description])

  return libraries
}

export { useGetPrograms }