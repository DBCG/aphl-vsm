import { useState, useEffect } from 'react'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { ProgramApiResponse } from '@/pages/api/programs'
import { programDetailsEndpointReturn } from '@/pages/api/programs/[id]/details'
import { ManifestDataMap } from '@/types/manifestTypes'

interface Res {
  manifestData: ManifestDataMap
  manifestLoading: boolean
  manifestError: string | null
}

interface UseGetManifest {
  programId: fhir4.Library['id']
  toggleRefresh?: boolean
}

const useGetProgramManifest = ({ programId, toggleRefresh }: UseGetManifest): Res => {
  const [manifestData, setManifestData] = useState<ManifestDataMap>({})
  const [manifestLoading, setManifestLoading] = useState(false)
  const [manifestError, setManifestError] = useState<string | null>(null)

  useEffect(() => {
    setManifestLoading(true)
    getManifestInfo()
    async function getManifestInfo(): Promise<void> {
      if (!programId) {
        setManifestError(`No program with ID ${programId} found`)
      } else {
        const programEndpoint = `/api/programs?id=${programId}`
        try {
          const response: Response = await fetch(programEndpoint)
          const programJson = await response.json() as ProgramApiResponse
          if ('error' in programJson) {
            throw new Error("no program returned from server")
          } else {
            // Identify the valueset library within the program
            // the program, by design, only has 2 relatedArtifacts, one of which is this library, other is a planDefinition
            const grouperLibraryUrl = getGrouperLibraryCanonical(programJson?.programs?.[0])
            const grouperEndpoint = `/api/programs/${programJson?.programs?.[0].id}/details?url=${grouperLibraryUrl}`

            const grouperData = await fetch(grouperEndpoint)
              .then((res) => res.json())
              .then(data => data as programDetailsEndpointReturn)
            if ('error' in grouperData) {
              throw new Error("error fetching grouper data")
            } else {
              if (grouperData?.expansionParameters) {
                setManifestData(grouperData.expansionParameters)
              }
            }
          }
        } catch (e) {
          console.error(e)
          setManifestError('Error finding manifest data')
        }
      }
      setManifestLoading(false)
    }
  }, [programId, toggleRefresh])
  return { manifestData, manifestLoading, manifestError }
}

export { useGetProgramManifest }
