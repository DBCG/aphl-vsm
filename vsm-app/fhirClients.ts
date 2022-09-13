import Client from 'fhir-kit-client'
import FhirKitClient from 'fhir-kit-client'

const {
  FHIR_CDR_URL,
  VSAC_USERNAME,
  VSAC_API_KEY,
  VSAC_BASE_URL
} = process.env as Record<string, string>

const ONTOSERVER_BASE_URL = 'https://r4.ontoserver.csiro.au/fhir'

const vsacAuthString = `${VSAC_USERNAME}:${VSAC_API_KEY}`

const fhirCdrClient = new FhirKitClient({ baseUrl: FHIR_CDR_URL })

const vsacFhirClient = new FhirKitClient({ baseUrl: VSAC_BASE_URL, customHeaders: { 'Authorization': `Basic ${Buffer.from(vsacAuthString).toString('base64')}` } })

const terminologyServerEndpoints = [
  { name: 'VSAC', url: VSAC_BASE_URL },
  { name: 'Ontoserver (R4)', url: ONTOSERVER_BASE_URL }
]

// we need the ability to switch between different terminology servers
class TerminologyClient {
  client: Client | undefined
  constructor() {
    this.setClient('vsac')
  }

  getClient() {
    return this.client
  }

  setClient(newClient: 'vsac' | 'ontoserverR4') {
    // defaults to VSAC
    let client = new FhirKitClient({
      baseUrl: VSAC_BASE_URL,
      customHeaders: {
        'Authorization': `Basic ${Buffer.from(vsacAuthString).toString('base64')}`
      }
    })
    // also supports this open test terminology server
    if (newClient === 'ontoserverR4') {
      client = new FhirKitClient({ baseUrl: ONTOSERVER_BASE_URL })
    }


    this.client = client
  }
}

console.log('client: ', TerminologyClient)

const terminologyClient = new TerminologyClient

export {
  fhirCdrClient,
  vsacFhirClient,
  terminologyClient,
  terminologyServerEndpoints
}
