import {FhirClient, fhirClient} from '../clients/FhirClient'
import {KeyCloakClient, keyCloakClient} from '../clients/KeyCloakClient'
import {TerminologyServerCredentials} from '../model/TerminologyServerCredential'

interface TsCredentialService {
    saveCredentials(userId: string, terminologyServerId: string, username: string, password: string): Promise<TerminologyServerCredentials>
    getAllCredentials(userId: string): Promise<TerminologyServerCredentials[]>
    getCredentials(userId: string, terminologyServerId: string): Promise<TerminologyServerCredentials>
    updateCredentials(userId: string, terminologyServerId: string, username: string, password: string): Promise<TerminologyServerCredentials>
}

class TsCredentialServiceImpl implements TsCredentialService {

    private static instance: TsCredentialServiceImpl

    readonly fhirClient: FhirClient;
    readonly keyCloakClient: KeyCloakClient;

    public static getInstance(fhirClient: FhirClient, keyCloakClient: KeyCloakClient): TsCredentialServiceImpl {
        if(!this.instance || this.instance.fhirClient != fhirClient || this.instance.keyCloakClient != keyCloakClient) {
            this.instance = new TsCredentialServiceImpl(fhirClient, keyCloakClient)
        }

        return this.instance
    }

    public constructor(
	     fhirClient: FhirClient,
	     keyCloakClient: KeyCloakClient
    ) {
        this.fhirClient = fhirClient;
        this.keyCloakClient = keyCloakClient;
    }

    public async saveCredentials(userId: string, terminologyServerId: string, username: string, password: string): Promise<TerminologyServerCredentials> {
        const endpoints = await this.fhirClient.getTerminologyServers()
        if(endpoints.find(e => e.address == terminologyServerId)) {
            return this.keyCloakClient.storeBasicAuthCreds(userId, terminologyServerId, username, password)
                .then(() => {
                    let cred: TerminologyServerCredentials = {terminologyServerId: terminologyServerId, username, password}
                    return cred
                }, () => Promise.reject("Problem storing basic auth credd"))
        } else {
            return Promise.reject("Trying to save credentials for unsupported terminology server")
        }

    }

    public async getCredentials(userId: string, terminologyServerId: string): Promise<TerminologyServerCredentials> {
        let cred: Promise<TerminologyServerCredentials> = this.keyCloakClient.getUserCredentials(userId, terminologyServerId)
        return cred
    }

    public async getAllCredentials(userId: string): Promise<TerminologyServerCredentials[]> {
        return this.keyCloakClient.getAllUserCredentials(userId)
    }

    public async updateCredentials(userId: string, terminologyServerId: string, username: string, password: string): Promise<TerminologyServerCredentials> {
        return this.keyCloakClient.storeBasicAuthCreds(userId, terminologyServerId, username, password)
                .then(() => {
                    let cred: TerminologyServerCredentials = {terminologyServerId: terminologyServerId, username, password}
                    return cred
                }, () => Promise.reject("Problem storing basic auth cred"))
    }

}

const tsCredentialService = TsCredentialServiceImpl.getInstance(fhirClient, keyCloakClient)

export { TsCredentialServiceImpl, tsCredentialService };    
export type { TsCredentialService };

