import { terminologyServerEndpoints, ONTOSERVER_R4_BASE_URL } from './fhirClientOptions'
import FhirKitClient from 'fhir-kit-client'

/**
 * Singleton TerminologyClient
 * 
 * @example
 * 
 * import TerminologyClient from './TerminologyClient'
 * 
 * TerminologyClient.connection.read(...)
 * TerminologyClient.setUrlAndAuth('newUrl', 'newAuth')
 * 
 */
class TerminologyClient {
  public connection: FhirKitClient | undefined
  private authString?: string
  private url: string

  constructor(url: string, authString?: string) {
    this.url = url
    this.authString = authString
    this.buildConnection()
  }

  private buildConnection() {
    if (!this.authString) {
      this.connection = new FhirKitClient({ baseUrl: this.url })
    } else {
      this.connection = new FhirKitClient({
        baseUrl: this.url,
        customHeaders: {
          'Authorization': `Basic ${Buffer.from(this.authString).toString('base64')}`
        }
      })
    }
  }

  public setUrlAndAuth(newUrl: string, authString?: string) {
    this.url = newUrl
    this.authString = authString
    this.buildConnection()
  }
}

let instance: TerminologyClient | undefined

if (process.env.VSAC_BASE_URL) {
  let vsacAuthString: string | undefined = undefined
  if (process.env.VSAC_USERNAME && process.env.VSAC_API_KEY) {
    vsacAuthString = `${process.env.VSAC_USERNAME}:${process.env.VSAC_API_KEY}`
  }

  instance = new TerminologyClient(process.env.VSAC_BASE_URL, vsacAuthString)

  Object.freeze(instance)
} else {
  throw Error('Default terminology server URL (VSAC_BASE_URL) is not set')
}

export default instance