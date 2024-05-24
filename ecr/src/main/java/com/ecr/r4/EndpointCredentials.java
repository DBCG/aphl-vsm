package com.ecr.r4;


import ca.uhn.fhir.model.api.annotation.DatatypeDef;
import ca.uhn.fhir.model.api.annotation.ResourceDef;
import org.hl7.fhir.r4.model.Endpoint;
import org.hl7.fhir.r4.model.Extension;
import org.hl7.fhir.r4.model.StringType;
import org.hl7.fhir.r4.model.Type;

import java.util.List;
import java.util.Optional;

@ResourceDef(id = "EndpointCredentials")
public class EndpointCredentials extends Endpoint {

    public static final String VSAC_USERNAME = "vsacUsername";
    public static final String API_KEY = "apiKey";

    public EndpointCredentials setUsername(StringType username) {
        if (username != null) {
            int index = findIndex(VSAC_USERNAME, null, this.getExtension());
            if (index != -1) {
                this.extension.set(index, new EndpointCredentialsUsernameExtension(username.toString()));
            } else {
                this.addExtension(new EndpointCredentialsUsernameExtension(username.toString()));
            }
        }
        return this;
    }

    public EndpointCredentials setApiKey(StringType apiKey) {
        if (apiKey != null) {
            int index = findIndex(API_KEY, null, this.getExtension());
            if (index != -1) {
                this.extension.set(index, new EndpointCredentialsApiKeyExtension(apiKey.toString()));
            } else {
                this.addExtension(new EndpointCredentialsApiKeyExtension(apiKey.toString()));
            }
        }
        return this;
    }

    private int findIndex(String url, Type value, List<Extension> extensions) {
        Optional<Extension> existingExtension;
        if (value != null) {
            existingExtension = extensions.stream()
                    .filter(e -> e.getUrl().equals(url) && e.getValue().equals(value))
                    .findAny();
        } else {
            existingExtension =
                    extensions.stream().filter(e -> e.getUrl().equals(url)).findAny();
        }
        if (existingExtension.isPresent()) {
            return extensions.indexOf(existingExtension.get());
        } else {
            return -1;
        }
    }

    @DatatypeDef(name = "EndpointCredentialsUsernameExtension", isSpecialization = true, profileOf = Extension.class)
    public class EndpointCredentialsUsernameExtension extends Extension {

        public EndpointCredentialsUsernameExtension(String vsacUsername) {
            super(VSAC_USERNAME, new StringType(vsacUsername));
        }
    }

    @DatatypeDef(name = "EndpointCredentialsApiKeyExtension", isSpecialization = true, profileOf = Extension.class)
    public class EndpointCredentialsApiKeyExtension extends Extension {

        public EndpointCredentialsApiKeyExtension(String apiKey) {
            super(API_KEY, new StringType(apiKey));
        }
    }
}