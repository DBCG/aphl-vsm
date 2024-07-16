import APITokenHandler from "@/helpers/server/ApiTokenHandler"
import { TerminologyServerCredentials } from "../model/TerminologyServerCredential"

interface KeyCloakClient {
    getAllUserCredentials(userId: string): Promise<TerminologyServerCredentials[]>
    getUserCredentials(userId: string, serverId: string): Promise<TerminologyServerCredentials>
    storeBasicAuthCreds(userId: string, serverId: string, username: string, password: string): Promise<void>
}

class KeyCloakClientImpl implements KeyCloakClient {
    private static instance: KeyCloakClientImpl
    private tokenHandler: APITokenHandler

    private constructor(apiTokenHandler: APITokenHandler) {
        this.tokenHandler = apiTokenHandler
    }

    public static getInstance(): KeyCloakClientImpl {
        if (!this.instance) {
            const ath = APITokenHandler.getInstance()
            this.instance = new KeyCloakClientImpl(ath)
        }

        return this.instance
    }

    async getAllUserCredentials(userId: string): Promise<TerminologyServerCredentials[]> {
        return this.tokenHandler.getBasicAuthCredsForAllUrls(userId)
    }

    async getUserCredentials(userId: string, serverId: string): Promise<TerminologyServerCredentials> {
        const basicAuthCredsPromise = this.tokenHandler.getBasicAuthCreds(userId, serverId)
        const basicAuthCreds = await basicAuthCredsPromise
        const creds:TerminologyServerCredentials = {
            terminologyServerId: basicAuthCreds.url,
            username: basicAuthCreds.username,
            password: basicAuthCreds.password
          }
          
        return creds
    }

    async storeBasicAuthCreds(userId: string, serverId: string, username: string, password: string): Promise<void> {
        return this.tokenHandler.storeBasicAuthCreds(userId, serverId, username, password)
    }
}

const keyCloakClient = KeyCloakClientImpl.getInstance()

export {KeyCloakClientImpl, keyCloakClient}
export type {KeyCloakClient}