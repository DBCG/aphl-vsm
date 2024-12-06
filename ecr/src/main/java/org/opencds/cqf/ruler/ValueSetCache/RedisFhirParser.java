package org.opencds.cqf.ruler.ValueSetCache;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;

import java.nio.charset.StandardCharsets;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

public class RedisFhirParser implements RedisSerializer<IBaseResource> {

    private final FhirContext myFhirContext;

    public RedisFhirParser(FhirContext fhirContext) {
      this.myFhirContext = fhirContext;
    }

    @Override
    public byte[] serialize(IBaseResource resource) throws SerializationException {
        try {
            IParser jsonParser = myFhirContext.newJsonParser(); // Use XML parser if needed
            String json = jsonParser.encodeResourceToString(resource);
            return json.getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new SerializationException("Error serializing FHIR resource", e);
        }
    }

    @Override
    public IBaseResource deserialize(byte[] bytes) throws SerializationException {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        try {
            IParser jsonParser = myFhirContext.newJsonParser();
            String json = new String(bytes, StandardCharsets.UTF_8);
            return jsonParser.parseResource(IBaseResource.class, json);
        } catch (Exception e) {
            throw new SerializationException("Error deserializing FHIR resource", e);
        }
    }
}