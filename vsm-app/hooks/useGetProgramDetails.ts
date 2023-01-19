import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { useState, useEffect } from 'react'

interface GrouperItem {
  id: string,
  name: string,
  title: string,
  url: string
}
interface ManifestDataMap {
  [key: string]: string[];
}

export interface Result {
  program: fhir4.Library | {}
  grouperData: GrouperItem[] | []
  manifestData: ManifestDataMap
  grouperLibId: string | null
}

// gets data necessary to build the program details page
// this includes:
// 1. program metadata
// 2. group metadata (name, canonical, title)
// 3. manifest data
const useGetProgramDetails = (id: string): Result => {
  // this is undefined
  const [programAndGrouperData, setProgramAndGrouperData] = useState<Result>(
    {
      program: {},
      grouperData: [],
      manifestData: {},
      grouperLibId: null
    }
  )

  useEffect(() => {
    let result: Result = {
      program: {},
      grouperData: [],
      manifestData: {},
      grouperLibId: null
    }

    async function getProgram(): Promise<void> {
      const programEndpoint = `/api/programs?id=${id}`

      try {
        const response: Response = await fetch(programEndpoint)
        const programJson = await response.json()

        // Identify the valueset library within the program
        // the program, by design, only has 2 relatedArtifacts, one of which is this library, other is a planDefinition
        const grouperLibraryUrl = getGrouperLibraryCanonical(programJson?.[0])
        const grouperEndpoint = `/api/programs/${programJson[0].id}/details?url=${grouperLibraryUrl}`

        const grouperData = await fetch(grouperEndpoint).then((res) => res.json())

        // if the data is found, override default empty objects
        if (programJson) {
          result.program = programJson[0]
        }

        result.grouperData = []

        if (grouperData && !grouperData.error) {
          result.grouperData = grouperData.valueSets
          result.grouperLibId = grouperData.grouperLibId
          result.manifestData = grouperData?.expansionParameters
        }

        setProgramAndGrouperData(result)
      } catch (e) {
        console.error('Error in useGetPrograms: ', e)
        setProgramAndGrouperData(result)
      }
    }
    void getProgram()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return programAndGrouperData
}

export { useGetProgramDetails }