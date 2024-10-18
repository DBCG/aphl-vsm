import { isValidThreeOrFourPartSemver } from '@/helpers/server/semverHelpers'
import { ProgramApiResponse } from 'pages/api/programs'
import { useState, useEffect } from 'react'

export interface SearchFilters {
  id?: string
  name?: string
  title?: string
  version?: string
  description?: string
  newProgram?: string | undefined
  refreshToggle?: boolean
}

const buildQuery = (args: any): string => {
  if (!args) return ''
  let query = []
  const strMatch = /id|name|title|description|version/
  for (const arg in args) {
    if (arg.match(strMatch) && `${args[arg]}` !== '' && `${args[arg]}` !== 'undefined') {
      query.push(`${arg}=${encodeURIComponent(args[arg])}`)
    }
  }
  return query.join('&')
}

const useGetPrograms = (fields: SearchFilters): [] | fhir4.Library[] => {
  const [libraries, setLibraries] = useState<fhir4.Library[]>([])
  const { id, name, title, description, version, newProgram, refreshToggle } = fields
  useEffect(() => {
    async function getPrograms(): Promise<void> {
      // early return if wrong format for version
      if (version && !isValidThreeOrFourPartSemver(version)) {
        setLibraries([])
      } else {
        let endpoint = '/api/programs'
        const query = buildQuery(fields)
        if (query.length) {
          endpoint = endpoint.concat('?', query)
        }
        try {
          const response: Response = await fetch(endpoint)
          if (!response.ok) {
            setLibraries([])
          } else {
            const json = await response.json() as ProgramApiResponse
            if ('error' in json) {
              setLibraries([])
            } else {
              setLibraries(json.programs)
            }
          }
        } catch (e) {
          setLibraries([])
        }
      }
    }
    void getPrograms()
    // disabled b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, title, version, description, newProgram, refreshToggle])

  return libraries
}

export { useGetPrograms }
