type TerminologyServerCredentials = {
    terminologyServerId: string,
    username: string,
    password: string
}

type TerminologyServerCredentialsResponse = {
    userId?: string,
    name: string,
    terminologyServerId: string,
    url?: string,
    username: string,
    password: string
}

export type {TerminologyServerCredentials, TerminologyServerCredentialsResponse}