import { useState, useEffect } from 'react'
import { is } from '@/helpers/is'

interface UseGetProgramDetails {
  programId: string
  toggleRefresh?: boolean
}

const useGetProgramById = ({ programId, toggleRefresh }: UseGetProgramDetails): fhir4.Library | null => {
  // this is undefined
  const [program, setProgram] = useState<fhir4.Library | null>(null)

  useEffect(() => {
    async function getProgram(): Promise<void> {
      if (!programId) return
      const programEndpoint = `/api/programs/${programId}?id=${programId}`

      try {
        const response: Response = await fetch(programEndpoint)
        const programJson = await response.json()

        if (is.library(programJson)) {
          setProgram(programJson)
        }
      } catch (e) {
        console.error('Error in useGetPrograms: ', e)
      }
    }
    void getProgram()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, toggleRefresh])

  return program
}

export { useGetProgramById }
