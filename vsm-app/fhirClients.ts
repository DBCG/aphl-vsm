import FhirKitClient from 'fhir-kit-client'

const fhirCdrClient = new FhirKitClient({ baseUrl: process.env.FHIR_CDR_URL as string })

export {
  fhirCdrClient
}
