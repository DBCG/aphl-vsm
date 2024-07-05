type TerminologyServerCredentials = {
    terminologyServerUrl: string,
    username: string,
    password: string
}

type TerminologyServerCredentialsRequest = {
    userId: string,
    terminologyServerUrl: string,
    username: string,
    password: string
}

export type {TerminologyServerCredentials, TerminologyServerCredentialsRequest}