package com.ecr.r4;

import org.hl7.fhir.r4.model.StringType;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class EndpointCredentialsTest {

    @Test
    void testSetters() {
        EndpointCredentials endpointCredentials = new EndpointCredentials();
        StringType userName = new StringType("testUsername");
        StringType apiKey = new StringType("test-api-key");

        endpointCredentials.setUsername(userName);
        Assertions.assertEquals(endpointCredentials.getExtensionByUrl("vsacUsername").getValue().toString(), userName.toString());

        endpointCredentials.setApiKey(apiKey);
        Assertions.assertEquals(endpointCredentials.getExtensionByUrl("apiKey").getValue().toString(), apiKey.toString());
    }
}
