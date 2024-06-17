const provisionalCsBase = {
  resourceType: 'CodeSystem',
  meta: {
    tag: [
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-authored'
      },
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-provisional'
      }
    ]
  },
  version: 'PROVISIONAL',
  status: 'draft',
  experimental: true,
  content: 'complete', // not sure abt this one? https://build.fhir.org/valueset-codesystem-content-mode.html
} as fhir4.CodeSystem

export { provisionalCsBase }