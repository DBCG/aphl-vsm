import { Endpoint } from "fhir/r4";

interface FhirClient {

    getTerminologyServers(): Promise<fhir4.Endpoint[]>

}

class FhirClientImpl implements FhirClient {
    private static instance: FhirClientImpl;

    public static getInstance(): FhirClientImpl {
        if (!this.instance) {
            this.instance = new FhirClientImpl
        }

        return this.instance
    }

    async getTerminologyServers(): Promise<Endpoint[]> {
        const endpoint:fhir4.Endpoint = {
            resourceType: "Endpoint",
            address: "http://testts.com",
            connectionType: { code: "" },
            payloadType: [],
            status: "active"
          }
          return [endpoint]
    }
}

const fhirClient = FhirClientImpl.getInstance()

export {FhirClientImpl, fhirClient}
export type {FhirClient}