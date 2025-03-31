import Client from 'fhir-kit-client'
import FhirKitClient from 'fhir-kit-client'
import { transformFromVSACToCqf } from '@/helpers/valueSetHelpers'
import { is } from '@/helpers/is'
import { cloneDeep } from 'lodash'
import { tsCredentialService } from '@/backend/services/TsCredentialService'

const { NEXT_PUBLIC_VSAC_BASE_URL } = process.env as Record<string, string>

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
class TerminologyClient {
  client: Client | undefined
  clientName: string
  constructor() {
    this.clientName = 'vsac'
    this.client = new FhirKitClient({ baseUrl: NEXT_PUBLIC_VSAC_BASE_URL })
  }

  async getClient(userId?: string) {
    if (userId) {
      const creds = await tsCredentialService.getVsacCredentials(userId)
      this.setClientAuth(creds)
    } else if (!this.isAuthSet()) {
      throw new Error('Terminology credentials are required to access the terminology server')
    }

    return this.clientName === 'vsac' ? decorateForVSACClient(this.client as Client) : this.client!
  }

  getClientName() {
    return this.clientName
  }

  setCustomClient({
    baseUrl = NEXT_PUBLIC_VSAC_BASE_URL,
    clientName = 'vsac',
    basicAuthHeader
  }: {
    baseUrl?: string
    clientName?: string
    basicAuthHeader: string
  }) {
    this.client = new FhirKitClient({
      baseUrl,
      customHeaders: { Authorization: `Basic ${basicAuthHeader}` }
    })
    this.clientName = clientName
  }

  private isAuthSet() {
    // @ts-ignore
    return this.client?.customHeaders?.Authorization != null
  }

  private setClientAuth(creds: { username: string; password: string }) {
    // @ts-ignore
    this.client.customHeaders['Authorization'] = `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`
  }
}

const TerminologyFhirClient = new TerminologyClient()

export default TerminologyFhirClient