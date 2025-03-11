import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { ProgramDetailsEffect, ProgramDetails } from '@/types/grouperTypes'
import useSwr from 'swr'
import { fetcher } from '@/utils'

// gets data necessary to build the program details page
// this includes:
// 1. program metadata
// 2. group metadata (name, canonical, title)
const useGetProgramDetails = (id: string): ProgramDetailsEffect => {
  let result: ProgramDetails = {
    program: null,
    grouperData: [],
    grouperLibrary: null,
    artifactAssessments: []
  }

  const { data: programData = {}, error } = useSwr(id ? `/api/programs/${id}` : null, fetcher)

  if (error) {
    console.error('Error fetching program data:', error)
    throw error
  }

  const { program, assessments } = programData
  // Identify the valueset library within the program
  // the program, by design, only has 2 relatedArtifacts, one of which is this library, other is a planDefinition
  const grouperLibraryUrl = getGrouperLibraryCanonical(program)
  
  const {
    data: grouperData,
    isLoading: grouperLoading,
    error: grouperError
  } = useSwr(() => `/api/programs/${program.id}/details?url=${grouperLibraryUrl}`, fetcher)

  // if the data is found, override default empty objects
  if (program) {
    result.program = program
  }

  if (assessments?.length) {
    result.artifactAssessments = assessments.map((assessment: fhir4.Basic) => {
      const content = assessment?.extension?.find((ext) => ext.url.includes('crmi-artifactAssessmentContent'))?.extension
      return {
        approvalDate: assessment?.extension?.find((ext) => ext.url.includes('crmi-artifactAssessmentDate'))?.valueDateTime
          ? new Date(assessment?.extension?.find((ext) => ext.url.includes('crmi-artifactAssessmentDate'))?.valueDateTime || '')
              .toISOString()
              .slice(0, 10)
          : '-',
        artifactAssessmentType: content?.find((ext) => ext.url.includes('informationType'))?.valueCode,
        artifactAssessmentSummary: content?.find((ext) => ext.url.includes('summary'))?.valueMarkdown,
        artifactAssessmentTarget: content?.find(
          (ext) => ext.url.includes('relatedArtifact') && ext.valueRelatedArtifact?.type === 'derived-from'
        )?.valueRelatedArtifact?.resource,
        artifactAssessmentRelatedArtifact: content?.find(
          (ext) => ext.url.includes('relatedArtifact') && ext.valueRelatedArtifact?.type === 'citation'
        )?.valueRelatedArtifact?.resource,
        artifactAssessmentAuthor: content?.find((ext) => ext.url.includes('author'))?.valueReference?.reference
      }
    })
  }

  result.grouperData = []

  if (grouperData && !grouperError) {
    result.grouperData = grouperData.valueSets
    result.grouperLibrary = grouperData?.grouperLibrary
  }

  return { programAndGrouperData: result, programAndGrouperDataLoading: grouperLoading, programAndGrouperDataError: grouperError }
}

export { useGetProgramDetails }
