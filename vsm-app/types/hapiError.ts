interface HapiError {
  response: {
    status: number
    data: fhir4.OperationOutcome
  }
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    url: string
    headers: Headers
  }
}

export type { HapiError }