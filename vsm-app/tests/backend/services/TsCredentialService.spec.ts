import { createMocks } from 'node-mocks-http'
import {FhirClient} from 'backend/clients/FhirClient'
import {KeyCloakClient} from 'backend/clients/KeyCloakClient'
import {TerminologyServerCredentials} from 'backend/model/TerminologyServerCredential'
import { TsCredentialServiceImpl } from '@/backend/services/TsCredentialService'

class FhirClientTest implements FhirClient {
    async getTerminologyServers(): Promise<fhir4.Endpoint[]> {
        const endpoint:fhir4.Endpoint = {
          resourceType: "Endpoint",
          address: "http://testts.com",
          connectionType: { code: "" },
          payloadType: [],
          status: "active"
        }
        return [endpoint]
      }

      async getTerminologyServer(id: string): Promise<fhir4.Endpoint> {
        if (id = "non-exist") {
          return undefined
        } else {
        const endpoint:fhir4.Endpoint = {
          resourceType: "Endpoint",
          address: id,
          connectionType: { code: "" },
          payloadType: [],
          status: "active"
        }
        return endpoint
      }
    }
}

class KeyCloakClientTest implements KeyCloakClient {
    async getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]> {
        const creds:TerminologyServerCredentials = {
            terminologyServerId: "http://testts.com",
            username: "someUsername",
            password: "somePassword"
          }
          return [creds]
    }

    async getUserCredentials(userId: String, inputUrl: string): Promise<TerminologyServerCredentials> {
        const creds:TerminologyServerCredentials = {
            terminologyServerId: "http://testts.com",
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

    const creds = await tsService.saveCredentials("someUserId", "someId","someUsername", "somePassword")

    expect(creds.username).toBe("someUsername")
    expect(creds.password).toBe("somePassword")
    expect(creds.terminologyServerId).toBe("someId")
  });

  test('TsCredentialService fails on save credentials on non existing terminology server', async () => {
    try {
        const fhirClient = new FhirClientTest()
        const keyCloakClient = new KeyCloakClientTest()
        const tsService = new TsCredentialServiceImpl(fhirClient, keyCloakClient)

        const creds = await tsService.saveCredentials("someUserId", "non-exist","someUsername", "somePassword")

        expect(true).toBe(false);
    } catch (e) {
        expect(e).toBe("Trying to save credentials for unsupported terminology server")
    }
  });