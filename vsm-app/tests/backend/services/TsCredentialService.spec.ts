import { createMocks } from 'node-mocks-http'
import {FhirClient} from 'backend/clients/FhirClient'
import {KeyCloakClient} from 'backend/clients/KeyCloakClient'
import {TerminologyServerCredentials} from 'backend/model/TerminologyServerCredential'
import { TsCredentialServiceImpl } from '@/backend/services/TsCredentialService'

class FhirClientTest implements FhirClient {
    async getTerminologyServers(): Promise<fhir4.Endpoint[]> {
        const endpoint:fhir4.Endpoint = {
          resourceType: "Endpoint",
          address: "",
          connectionType: { code: "" },
          payloadType: [],
          status: "active"
        }
        return [endpoint]
      }
}

class KeyCloakClientTest implements KeyCloakClient {
    async getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]> {
        const creds:TerminologyServerCredentials = {
            terminologyServerUrl: "http://testts.com",
            username: "someUsername",
            password: "somePassword"
          }
          return [creds]
    }

    async getUserCredentials(userId: String, inputUrl: string): Promise<TerminologyServerCredentials> {
        const creds:TerminologyServerCredentials = {
            terminologyServerUrl: "http://testts.com",
            username: "someUsername",
            password: "somePassword"
          }
          return creds
    }

    async storeBasicAuthCreds(userId: String, inputUrl: String, username: String, password: String): Promise<void> {
        return
    }
}

test('TsCredentialService saves credentials on existing terminology server', async () => {
    const fhirClient = new FhirClientTest()
    const keyCloakClient = new KeyCloakClientTest()
    const tsService = new TsCredentialServiceImpl(fhirClient, keyCloakClient)

    const creds = await tsService.getCredentials("someUserId", "http://testts.com")

    expect(creds.username).toBe("someUsername")
    expect(creds.password).toBe("somePassword")
    expect(creds.terminologyServerUrl).toBe("http://testts.com")
  });