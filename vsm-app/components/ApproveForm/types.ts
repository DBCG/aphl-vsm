import { Options } from 'react-select'

export interface approvalFormParams {
  approvalDate: Date
  artifactAssessmentType: keyof typeof artifactAssessmentInfoTypes
  artifactAssessmentSummary: string
  artifactAssessmentTarget: string
  artifactAssessmentRelatedArtifact: string
  artifactAssessmentAuthor?: string
}

export const artifactAssessmentInfoTypes = {
  comment: 'Comment',
  classifier: 'Classifier',
  rating: 'Rating',
  response: 'Response',
  'change-request': 'Change Request'
  // technically container is
  // a valid response but disabling
  // it since it doesn't make
  // sense in the context
  // of an approval
  // container: 'Container',
}

export const artifactAssessmentInfoTypeOptions: Options<{ value: keyof typeof artifactAssessmentInfoTypes; label: string }> = Object.entries(
  artifactAssessmentInfoTypes
).map(([key, value]) => ({ value: key, label: value })) as Options<{ value: keyof typeof artifactAssessmentInfoTypes; label: string }>