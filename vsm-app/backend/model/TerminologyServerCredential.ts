type TerminologyServerCredentials = {
    terminologyServerId: string,
    username: string,
    password: string
}

type TerminologyServerCredentialsRequest = {
    userId: string,
    terminologyServerId: string,
    username: string,
    password: string
}

export type {TerminologyServerCredentials, TerminologyServerCredentialsRequest}