//use injectify for dependency injection?
import { injectable, inject } from "inversify";
import "reflect-metadata";
import { FhirClient, KeyCloadClient } from "./clients";
import { TYPES } from "./types";


// https://www.npmjs.com/package/inversify FOR DEPENDENCY INJECTION
@injectable()
class TsCredentialServiceImpl implements TsCredentialService {

    private fhirClient: FhirClient;
    private keyCloakClient: KeyCloadClient;

    public constructor(
	    @inject(TYPES.FhirClient) fhirClient: FhirClient,
	    @inject(TYPES.KeyCloadClient) keyCloakClient: KeyCloadClient
    ) {
        this.fhirClient = fhirClient;
        this.keyCloakClient = keyCloakClient;
    }

    public saveCredentials(userId: UUID, terminologyServerUrl: String, username: String, password: String) { // implement credentials }
    public getCredentials(...) { // implement get credentials }
    public updateCredentials(...) { // implement update credentials}

}

export { TsCredentialServiceImpl };
