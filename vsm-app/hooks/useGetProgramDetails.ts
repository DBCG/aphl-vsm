import { useState, useEffect } from 'react';
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers';
import { Result } from '@/types/grouperTypes';
import { ProgramApiResponse } from '@/pages/api/programs';

interface UseGetProgramDetails {
  id: string;
  toggleRefresh?: boolean;
}
export type ToString<T> = { [k in keyof T]: string };

// gets data necessary to build the program details page
// this includes:
// 1. program metadata
// 2. group metadata (name, canonical, title)
// 3. manifest data
const useGetProgramDetails = ({ id, toggleRefresh }: UseGetProgramDetails): Result => {
  // this is undefined
  const [programAndGrouperData, setProgramAndGrouperData] = useState<Result>({
    program: null,
    grouperData: [],
    manifestData: {},
    grouperLibrary: null,
    artifactAssessments: []
  });

  useEffect(() => {
    let result: Result = {
      program: null,
      grouperData: [],
      manifestData: {},
      grouperLibrary: null,
      artifactAssessments: []
    };

    async function getProgram(): Promise<void> {
      if (!id) return;
      const programEndpoint = `/api/programs?id=${id}`;

      try {
        const response: Response = await fetch(programEndpoint);
        const json = await response.json() as ProgramApiResponse;
        if ('error' in json) {
          throw json.error;
        } else {
          const { programs, assessments } = json;
          // Identify the valueset library within the program
          // the program, by design, only has 2 relatedArtifacts, one of which is this library, other is a planDefinition
          const grouperLibraryUrl = getGrouperLibraryCanonical(programs?.[0]);
          const grouperEndpoint = `/api/programs/${programs[0].id}/details?url=${grouperLibraryUrl}`;

          const grouperData = await fetch(grouperEndpoint).then((res) => res.json());

          // if the data is found, override default empty objects
          if (programs) {
            result.program = programs[0];
          }
          if (assessments?.length) {
            result.artifactAssessments = assessments.map((assessment) => {
              const content = assessment?.extension?.find(ext => ext.url.includes('crmi-artifactAssessmentContent'))?.extension;
              return {
                approvalDate: assessment?.extension?.find(ext => ext.url.includes('crmi-artifactAssessmentDate'))?.valueDateTime ? new Date(assessment?.extension?.find(ext => ext.url.includes('crmi-artifactAssessmentDate'))?.valueDateTime || '').toISOString().slice(0, 10) : '-',
                artifactCommentType: content?.find(ext => ext.url.includes('informationType'))?.valueCode,
                artifactCommentText: content?.find(ext => ext.url.includes('summary'))?.valueMarkdown,
                artifactCommentTarget: content?.find(ext => ext.url.includes('relatedArtifact') && ext.valueRelatedArtifact?.type === 'derived-from')?.valueRelatedArtifact?.resource,
                artifactCommentReference: content?.find(ext => ext.url.includes('relatedArtifact') && ext.valueRelatedArtifact?.type === 'citation')?.valueRelatedArtifact?.resource,
                artifactCommentUser: content?.find(ext => ext.url.includes('author'))?.valueReference?.reference
              };
            });
          }

          result.grouperData = [];

          if (grouperData && !grouperData.error) {
            result.grouperData = grouperData.valueSets;
            result.grouperLibrary = grouperData?.grouperLibrary;
            result.manifestData = grouperData?.expansionParameters;
          }

          setProgramAndGrouperData(result);
        }
      } catch (e) {
        console.error('Error in useGetPrograms: ', e);
        setProgramAndGrouperData(result);
      }
    }
    getProgram();
    // disabled eslint here b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, toggleRefresh]);
  return programAndGrouperData;
};

export { useGetProgramDetails };
