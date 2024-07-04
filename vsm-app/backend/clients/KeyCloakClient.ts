import { TerminologyServerCredentials } from "../model/TerminologyServerCredential"

interface KeyCloakClient {
    getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]>
    getUserCredentials(userId: String, inputUrl: string): Promise<TerminologyServerCredentials>
    storeBasicAuthCreds(userId: String, inputUrl: String, username: String, password: String): Promise<void>
}

class KeyCloakClientImpl implements KeyCloak {

}

export {KeyCloakClientImpl}
export type {KeyCloakClient}