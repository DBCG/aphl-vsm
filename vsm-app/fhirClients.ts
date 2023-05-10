import Client from 'fhir-kit-client'
import FhirKitClient from 'fhir-kit-client'

const { FHIR_CDR_URL, VSAC_USERNAME, VSAC_API_KEY, VSAC_BASE_URL, ONTOSERVER_R4_BASE_URL } = process.env as Record<
  string,
  string
>

const vsacAuthString = `${VSAC_USERNAME}:${VSAC_API_KEY}`

const fhirCdrClient = new FhirKitClient({ baseUrl: FHIR_CDR_URL })

const vsacFhirClient = new FhirKitClient({
  baseUrl: VSAC_BASE_URL,
  customHeaders: { Authorization: `Basic ${Buffer.from(vsacAuthString).toString('base64')}` }
})

// we need the ability to switch between different terminology servers
class PrivateTerminologyClient {
  client: Client | undefined
  clientName: string
  constructor() {
    this.setClient('vsac')
    this.clientName = 'vsac'
  }

  getClient() {
    return this.client
  }

  getClientName() {
    return this.clientName
  }

  setClient(newClient: 'vsac' | 'ontoserverR4') {
    // defaults to VSAC
    let client = new FhirKitClient({
      baseUrl: VSAC_BASE_URL,
      customHeaders: {
        Authorization: `Basic ${Buffer.from(vsacAuthString).toString('base64')}`
      }
    })
    // also supports this open test terminology server
    if (newClient === 'ontoserverR4') {
      client = new FhirKitClient({ baseUrl: ONTOSERVER_R4_BASE_URL })
    }
    this.clientName = newClient
    this.client = client
  }
}

class TerminologyClient {
  static instance: any
  constructor() {
    throw new Error('Use TerminologyClient.getInstance()')
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new PrivateTerminologyClient()
    }
    return this.instance
  }
}

const terminologyClient = new PrivateTerminologyClient()

export { fhirCdrClient, vsacFhirClient, TerminologyClient, terminologyClient }
