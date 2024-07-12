import APITokenHandler from "@/helpers/server/ApiTokenHandler"
import { TerminologyServerCredentials } from "../model/TerminologyServerCredential"

interface KeyCloakClient {
    getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]>
    getUserCredentials(userId: String, inputUrl: string): Promise<TerminologyServerCredentials>
    storeBasicAuthCreds(userId: String, inputUrl: String, username: String, password: String): Promise<void>
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

    async getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]> {
        const creds:TerminologyServerCredentials = {
            terminologyServerId: "http://testts.com",
            username: "someUsername",
            password: "somePassword"
          }
        const creds2:TerminologyServerCredentials = {
        terminologyServerId: "http://testts2.com",
        username: "someUsername",
        password: "somePassword"
        }
          return [creds, creds2]
    }

    async getUserCredentials(userId: string, inputUrl: string): Promise<TerminologyServerCredentials> {
        const basicAuthCredsPromise = this.tokenHandler.getBasicAuthCreds(userId, inputUrl)
        const basicAuthCreds = await basicAuthCredsPromise
        const creds:TerminologyServerCredentials = {
            terminologyServerId: basicAuthCreds.url,
            username: basicAuthCreds.username,
            password: basicAuthCreds.password
          }
          return creds
    }

    async storeBasicAuthCreds(userId: String, inputUrl: String, username: String, password: String): Promise<void> {
        return
    }
}

const keyCloakClient = KeyCloakClientImpl.getInstance()

export {KeyCloakClientImpl, keyCloakClient}
export type {KeyCloakClient}