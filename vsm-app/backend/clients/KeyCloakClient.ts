import { TerminologyServerCredentials } from "../model/TerminologyServerCredential"

interface KeyCloakClient {
    getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]>
    getUserCredentials(userId: String, inputUrl: string): Promise<TerminologyServerCredentials>
    storeBasicAuthCreds(userId: String, inputUrl: String, username: String, password: String): Promise<void>
}

class KeyCloakClientImpl implements KeyCloakClient {
    private static instance: KeyCloakClientImpl

    public static getInstance(): KeyCloakClientImpl {
        if (!this.instance) {
            this.instance = new KeyCloakClientImpl
        }

        return this.instance
    }

    async getAllUserCredentials(userId: String): Promise<TerminologyServerCredentials[]> {
        const creds:TerminologyServerCredentials = {
            terminologyServerUrl: "http://testts.com",
            username: "someUsername",
            password: "somePassword"
          }
        const creds2:TerminologyServerCredentials = {
        terminologyServerUrl: "http://testts2.com",
        username: "someUsername",
        password: "somePassword"
        }
          return [creds, creds2]
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

const keyCloakClient = KeyCloakClientImpl.getInstance()

export {KeyCloakClientImpl, keyCloakClient}
export type {KeyCloakClient}