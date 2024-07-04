type TerminologyServerCredentials = {
    terminologyServerUrl: string,
    username: string,
    password: string
}

type TerminologyServerCredentialsRequest = {
    userId: String,
    terminologyServerUrl: string,
    username: string,
    password: string
}

export type {TerminologyServerCredentials, TerminologyServerCredentialsRequest}