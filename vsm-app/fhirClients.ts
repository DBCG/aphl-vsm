import FhirKitClient from 'fhir-kit-client'

const { 
  FHIR_CDR_URL,
  VSAC_USERNAME,
  VSAC_API_KEY,
  VSAC_BASE_URL
} = process.env as Record<string, string>

const vsacAuthString = `${VSAC_USERNAME}:${VSAC_API_KEY}`

const fhirCdrClient = new FhirKitClient({ baseUrl: FHIR_CDR_URL })

const vsacFhirClient = new FhirKitClient({ baseUrl: VSAC_BASE_URL, customHeaders: { 'Authorization': `Basic ${Buffer.from(vsacAuthString).toString('base64')}` } })

export {
  fhirCdrClient,
  vsacFhirClient
}
