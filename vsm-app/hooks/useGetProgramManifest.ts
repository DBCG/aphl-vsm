import { useState, useEffect } from 'react'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'

interface ManifestDataMap {
  [key: string]: string[]
}

interface UseGetManifest {
  programId: fhir4.Library['id']
  toggleRefresh?: boolean
}

const useGetProgramManifest = ({ programId, toggleRefresh }: UseGetManifest): ManifestDataMap => {
  const [manifestData, setManifestData] = useState({})

  useEffect(() => {
    async function getManifestInfo(): Promise<void> {
      if (!programId) return
      const programEndpoint = `/api/programs?id=${programId}`

      try {
        const response: Response = await fetch(programEndpoint)
        const programJson = await response.json()

        // Identify the valueset library within the program
        // the program, by design, only has 2 relatedArtifacts, one of which is this library, other is a planDefinition
        const grouperLibraryUrl = getGrouperLibraryCanonical(programJson?.[0])
        const grouperEndpoint = `/api/programs/${programJson[0].id}/details?url=${grouperLibraryUrl}`

        const grouperData = await fetch(grouperEndpoint).then((res) => res.json())

        if (grouperData?.expansionParameters) {
          setManifestData(grouperData.expansionParameters)
        }
      } catch (e) {
        console.error(e)
      }
    }
    void getManifestInfo()
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, toggleRefresh])
  return manifestData
}

export { useGetProgramManifest }
