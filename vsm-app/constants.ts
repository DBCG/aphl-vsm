
export const AUTHENTICATION_TYPE_URL = 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-endpoint-authentication-type'

export const VSM_META_PROFILE_URLS = {
  VSM_GROUPERVALUESET_URL: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-groupervalueset'
}

// Stores Jobs in local storage and checks for job status
export const JOB_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

export const JOB_TYPE = {
  EXPORT: 'EXPORT',
  CHANGE_LOG: 'CHANGE_LOG'
}