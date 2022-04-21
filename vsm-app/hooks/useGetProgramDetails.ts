import { useState, useEffect } from 'react'

interface GrouperItem {
  id: string,
  name: string,
  title: string,
  url: string
}

export interface Result {
  program: fhir4.Library | {}
  grouperData: GrouperItem[] | []
}

// gets data necessary to build the program details page
// this includes:
// 1. program metadata
// 2. group metadata (name, canonical, title)
const useGetProgramDetails = (id: string): Result => {
  const [programAndGrouperData, setProgramAndGrouperData] = useState({ program: {}, grouperData: [] })

  useEffect(() => {
    async function getProgram(): Promise<void> {
      const programEndpoint = `/api/programs?id=${id}`

      let result = {
        program: {},
        grouperData: []
      }

      try {
        const response: Response = await fetch(programEndpoint)
        const programJson = await response.json()

        // Identify the valueset library within the program
        // the program, by design, only has 2 relatedArtifacts, one of which is this library
        const grouperLibrary = programJson?.[0]?.relatedArtifact?.filter((a: any) => a?.type === 'composed-of' && a?.resource?.includes('/Library/'))?.[0]
        const grouperEndpoint = `/api/valueset/groupers?url=${grouperLibrary.resource}`

        const groupers = await fetch(grouperEndpoint)
        const grouperData = await groupers.json()
        // if the data is found, override default empty objects
        if (programJson) {
          result.program = programJson[0]
        }
        if (grouperData) {
          result.grouperData = grouperData
        }
        setProgramAndGrouperData(result)
      } catch (e) {
        setProgramAndGrouperData(result)
        console.log('Error in useGetPrograms: ', e)
      }
    }
    void getProgram()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return programAndGrouperData
}

export { useGetProgramDetails }