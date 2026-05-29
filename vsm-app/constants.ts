
export const AUTHENTICATION_TYPE_URL = 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-endpoint-authentication-type'
export const ARTIFACT_ROUTE_URL = 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-artifactRoute'

// Auth-type values stored in the AUTHENTICATION_TYPE_URL extension's valueString.
// These are the option KEYS (not labels) and must stay the single source of truth
// shared by the endpoint form, the settings page, and the validation API route.
export const AUTH_TYPE = {
  NONE: 'none',
  BASIC: 'basic'
} as const

export const VSM_META_PROFILE_URLS = {
  VSM_GROUPERVALUESET_URL: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-groupervalueset'
}

export const PACKAGE_CACHE_IDENTIFIER_SYSTEM = 'http://aphl.org/fhir/vsm/cache/package'
export const PACKAGE_CACHE_TAG = { system: 'http://aphl.org/fhir/vsm/cache', code: 'package-cache' }

// Stores Jobs in local storage and checks for job status
export const JOB_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

export const JOB_TYPE = {
  EXPORT: 'EXPORT',
  CHANGE_LOG: 'CHANGE_LOG',
  RELEASE: 'RELEASE',
  FETCH_DEPENDENCIES: 'FETCH_DEPENDENCIES'
}