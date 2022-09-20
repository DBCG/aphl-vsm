import FhirKitClient from 'fhir-kit-client'

const vsacAuthString = `${process.env.VSAC_USERNAME}:${process.env.VSAC_API_KEY}`

let fhirCdrClient
if (process.env.NEXT_PUBLIC_FHIR_CDR_URL) {
  fhirCdrClient = new FhirKitClient({
    baseUrl: process.env.NEXT_PUBLIC_FHIR_CDR_URL
  })
} else {
  throw Error('Missing .env variable for NEXT_PUBLIC_FHIR_CDR_URL')
}

let vsacFhirClient: FhirKitClient
if (process.env.NEXT_PUBLIC_VSAC_BASE_URL) {
  vsacFhirClient = new FhirKitClient({
    baseUrl: process.env.NEXT_PUBLIC_VSAC_BASE_URL,
    customHeaders: {
      'Authorization': `Basic ${Buffer.from(vsacAuthString).toString('base64')}`
    }
  })
} else {
  throw Error('Missing .env variable for NEXT_PUBLIC_VSAC_BASE_URL')
}

export {
  fhirCdrClient,
  vsacFhirClient
}
