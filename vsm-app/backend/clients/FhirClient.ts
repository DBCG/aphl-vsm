import { Endpoint } from "fhir/r4";
import { fhirCdrClient } from "@/fhirClients"

interface FhirClient {

    getTerminologyServers(): Promise<fhir4.Endpoint[]>
    getTerminologyServer(id: string): Promise<Endpoint>

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
        const endpointBundle = await fhirCdrClient.search({
            resourceType: 'Endpoint',
            searchParams: {
                _total: "accurate",
                identifier: "terminologyEndpoint"
            }
            }) as fhir4.Bundle

          return endpointBundle?.entry?.map(e => e.resource as fhir4.Endpoint) || []
    }

    async getTerminologyServer(id: string): Promise<Endpoint> {
        return await fhirCdrClient.read({
            resourceType: 'Endpoint',
            id: id
            }) as fhir4.Endpoint
    }
}

const fhirClient = FhirClientImpl.getInstance()

export {FhirClientImpl, fhirClient}
export type {FhirClient}