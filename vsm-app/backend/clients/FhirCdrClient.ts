import { Endpoint } from 'fhir/r4'
import FhirKitClient from 'fhir-kit-client'
import Client from 'fhir-kit-client'
import Logger from '@/helpers/server/logger'

const { FHIR_CDR_URL, FHIR_CDR_BASIC_AUTH_USERNAME, FHIR_CDR_BASIC_AUTH_PASSWORD } = process.env as Record<string, string>
const fhirCdrAuthString = `${FHIR_CDR_BASIC_AUTH_USERNAME}:${FHIR_CDR_BASIC_AUTH_PASSWORD}`

class FhirCdrClient {
  private static instance: FhirCdrClient
  static client: any

  constructor() {
    FhirCdrClient.client = new FhirKitClient({
      baseUrl: FHIR_CDR_URL,
      customHeaders: {
        'Accept': 'Application/fhir+json',
        'x-b3-traceid': Logger.getLogId(),
        ...(FHIR_CDR_BASIC_AUTH_USERNAME &&
          FHIR_CDR_BASIC_AUTH_PASSWORD && { Authorization: `Basic ${Buffer.from(fhirCdrAuthString).toString('base64')}` })
      }
    })
  }

  static getClient(): Client {
    if (this.client.customHeaders) {
      (this.client.customHeaders as Record<string, string>)['x-b3-traceid'] = Logger.getLogId()
    }
    return this.client
  }

  public static getInstance(): Client {
    if (!this.instance) {
      this.instance = new FhirCdrClient()
    }

    return this.getClient()
  }

  async getTerminologyServers(): Promise<Endpoint[]> {
    const endpointBundle = (await FhirCdrClient.getInstance().search({
      resourceType: 'Endpoint',
      searchParams: {
        _total: 'accurate',
        identifier: 'terminologyEndpoint'
      }
    })) as fhir4.Bundle

    return endpointBundle?.entry?.map((e) => e.resource as fhir4.Endpoint) || []
  }

  async getTerminologyServer(id: string): Promise<Endpoint> {
    return (await FhirCdrClient.getInstance().read({
      resourceType: 'Endpoint',
      id: id
    })) as fhir4.Endpoint
  }

  async getVSACTerminologyServer(): Promise<Endpoint> {
    return (await FhirCdrClient.getInstance().read({
      resourceType: 'Endpoint',
      id: 'vsac' // TODO: hard-coded, we should double check seed data always adds this as ID
    })) as fhir4.Endpoint
  }
}

export default FhirCdrClient
