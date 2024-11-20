import Client from 'fhir-kit-client'
import { getLogger } from '@/helpers/server/logger'
import FhirKitClient from 'fhir-kit-client'
import { transformFromVSACToCqf } from '@/helpers/valueSetHelpers'
import { is } from '@/helpers/is'
import { cloneDeep } from 'lodash'

const {
  FHIR_CDR_URL,
  VSAC_USERNAME,
  VSAC_API_KEY,
  NEXT_PUBLIC_VSAC_BASE_URL,
  ONTOSERVER_R4_BASE_URL,
  FHIR_CDR_BASIC_AUTH_USERNAME,
  FHIR_CDR_BASIC_AUTH_PASSWORD
} = process.env as Record<string, string>

const vsacAuthString = `${VSAC_USERNAME}:${VSAC_API_KEY}`
const fhirCdrAuthString = `${FHIR_CDR_BASIC_AUTH_USERNAME}:${FHIR_CDR_BASIC_AUTH_PASSWORD}`

const fhirCdrClient = new FhirKitClient({
  baseUrl: FHIR_CDR_URL,
  customHeaders: {
    'x-b3-traceid': '123',
    ...(FHIR_CDR_BASIC_AUTH_USERNAME &&
      FHIR_CDR_BASIC_AUTH_PASSWORD && { Authorization: `Basic ${Buffer.from(fhirCdrAuthString).toString('base64')}` })
  }
})

const vsacFhirClient = new FhirKitClient({
  baseUrl: NEXT_PUBLIC_VSAC_BASE_URL,
  customHeaders: { Authorization: `Basic ${Buffer.from(vsacAuthString).toString('base64')}` }
})

const decorateForVSACClient = (client: Client) => {
  const clonedClient = cloneDeep(client)
  clonedClient.search = (params) => {
    return client.search(params).then((res) => {
      if (is.bundle(res)) {
        res.entry = res?.entry?.map((i: fhir4.BundleEntry) => {
          const resource = transformFromVSACToCqf(i.resource as fhir4.ValueSet, i.fullUrl as string)
          return {
            ...i,
            resource
          }
        })
      }
      return res
    })
  }

  clonedClient.read = (params) => {
    return client.read(params).then((i) => {
      if (is.valueSet(i)) {
        return transformFromVSACToCqf(i)
      }
      return i
    })
  }
  return clonedClient
}

// we need the ability to switch between different terminology servers
class PrivateTerminologyClient {
  client: Client | undefined
  clientName: string
  constructor() {
    this.setClient('vsac')
    this.clientName = 'vsac'
  }

  getClient() {
    return this.clientName === 'vsac' ? decorateForVSACClient(this.client as Client) : this.client
  }

  getClientName() {
    return this.clientName
  }

  setCustomClient({ baseUrl, clientName, basicAuthHeader }: { baseUrl: string; clientName: string; basicAuthHeader: string }) {
    this.client = new FhirKitClient({
      baseUrl,
      customHeaders: { Authorization: `Basic ${basicAuthHeader}` }
    })
    this.clientName = clientName
  }

  setClient(newClient: 'vsac' | 'ontoserverR4' | 'vsm') {
    // defaults to VSAC
    let client = new FhirKitClient({
      baseUrl: NEXT_PUBLIC_VSAC_BASE_URL,
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
