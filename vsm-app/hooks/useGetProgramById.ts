import { useState, useEffect } from 'react'

const useGetProgramById = (id: string): [] | fhir4.Library[] => {
  const [program, setProgram] = useState([])

  useEffect(() => {
    async function getProgram(): Promise<void> {
      const programEndpoint = `/api/programs?id=${id}`

      try {
        const response: Response = await fetch(programEndpoint)
        const programJson = await response.json()
       
        // Identify the valueset library within the program
        const grouperLibrary = programJson?.[0]?.relatedArtifact?.filter(a => a?.type === 'composed-of' && a?.resource?.includes('/Library/'))?.[0]
        const grouperEndpoint = `/api/valueset/groupers`
        

        if (!programJson) {
          setProgram([])
        } else {
          setProgram(programJson)
        }
      } catch(e) {
        setProgram([])
        console.log('Error in useGetPrograms: ', e)
      }
    }
    void getProgram()
    // disabled b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return program
}

export { useGetProgramById }