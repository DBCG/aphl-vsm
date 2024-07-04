import {FhirClient} from '../clients/FhirClient'
import {KeyCloakClient} from '../clients/KeyCloakClient'
import {TerminologyServerCredentials} from '../model/TerminologyServerCredential'

interface TsCredentialService {
    saveCredentials(userId: string, terminologyServerUrl: string, username: string, password: string): Promise<TerminologyServerCredentials>
    getAllCredentials(userId: string): Promise<TerminologyServerCredentials[]>
    getCredentials(userId: string, terminologyServerUrl: string): Promise<TerminologyServerCredentials>
    updateCredentials(userId: string, terminologyServerUrl: string, username: string, password: string): Promise<TerminologyServerCredentials>
}

class TsCredentialServiceImpl implements TsCredentialService {

    readonly fhirClient: FhirClient;
    readonly keyCloakClient: KeyCloakClient;

    public constructor(
	     fhirClient: FhirClient,
	     keyCloakClient: KeyCloakClient
    ) {
        this.fhirClient = fhirClient;
        this.keyCloakClient = keyCloakClient;
    }

    public async saveCredentials(userId: string, terminologyServerUrl: string, username: string, password: string): Promise<TerminologyServerCredentials> {
        const endpoints = await this.fhirClient.getTerminologyServers()
        if(endpoints.find(e => e._address == terminologyServerUrl)) {
            return this.keyCloakClient.storeBasicAuthCreds(userId, terminologyServerUrl, username, password)
                .then(() => {
                    let cred: TerminologyServerCredentials = {terminologyServerUrl, username, password}
                    return cred
                }, () => Promise.reject("Problem storing basic auth cred"))
        } else {
            return Promise.reject("Trying to save credentials for unsupported terminilogy server")
        }

    }

    public async getCredentials(userId: string, terminologyServerUrl: string): Promise<TerminologyServerCredentials> {
        let cred: Promise<TerminologyServerCredentials> = this.keyCloakClient.getUserCredentials(userId, terminologyServerUrl)
        return cred
    }

    public async getAllCredentials(userId: string): Promise<TerminologyServerCredentials[]> {
        return this.keyCloakClient.getAllUserCredentials(userId)
    }

    public async updateCredentials(userId: string, terminologyServerUrl: string, username: string, password: string): Promise<TerminologyServerCredentials> {
        return this.keyCloakClient.storeBasicAuthCreds(userId, terminologyServerUrl, username, password)
                .then(() => {
                    let cred: TerminologyServerCredentials = {terminologyServerUrl, username, password}
                    return cred
                }, () => Promise.reject("Problem storing basic auth cred"))
    }

}

export { TsCredentialServiceImpl };    
export type { TsCredentialService };

