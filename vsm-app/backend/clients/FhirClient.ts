
interface FhirClient {
    //readonly fhirClient: FhirClient

    getTerminologyServers(): Promise<fhir4.Endpoint[]>

}

class FhirClientImpl implements FhirClient {

}

export {FhirClientImpl}
export type {FhirClient}