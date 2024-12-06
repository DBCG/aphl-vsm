package org.opencds.cqf.ruler.ValueSetCache;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import org.hl7.fhir.instance.model.api.IBaseResource;

public class RedisFhirParser     {

    private final FhirContext myFhirContext;

    public RedisFhirParser(FhirContext fhirContext) {
      this.myFhirContext = fhirContext;
    }

    public String serialize(IBaseResource resource) {
            IParser jsonParser = myFhirContext.newJsonParser(); // Use XML parser if needed
            return jsonParser.encodeResourceToString(resource);
    }

    public IBaseResource deserialize(String string) {
        if (string == null || string.length() == 0) {
            return null;
        }
            IParser jsonParser = myFhirContext.newJsonParser();
            return jsonParser.parseResource(IBaseResource.class, string);
    }
}