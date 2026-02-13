/**
 * Helper functions for identifying and working with FHIR Endpoints
 */

/**
 * Checks if an endpoint is the VSAC endpoint by matching its well-known URL
 */
export const isVSACEndpoint = (endpoint: fhir4.Endpoint | undefined | null): boolean => {
  if (!endpoint?.address) return false

  const address = endpoint.address.toLowerCase()
  return address === 'http://cts.nlm.nih.gov/fhir' ||
         address === 'https://cts.nlm.nih.gov/fhir' ||
         address === 'http://cts.nlm.nih.gov/fhir/' ||
         address === 'https://cts.nlm.nih.gov/fhir/'
}

/**
 * Finds the VSAC endpoint from an array of endpoints
 */
export const findVSACEndpoint = (endpoints: fhir4.Endpoint[] | undefined): fhir4.Endpoint | undefined => {
  if (!endpoints) return undefined
  return endpoints.find(isVSACEndpoint)
}
