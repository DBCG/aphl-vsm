export interface error {
  response: { status: Response['status']; data: fhir4.OperationOutcome; };
  config: { headers: Response['headers']; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; url: string; };
}