package org.opencds.cqf.ruler.ValueSetCache;

import ca.uhn.fhir.context.FhirContext;

import java.nio.charset.StandardCharsets;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

public class RedisFhirParser implements RedisSerializer<IBaseResource> {

    private final FhirContext fhirContext;

    public RedisFhirParser(FhirContext fhirContext) {
        this.fhirContext = fhirContext; // Change to the desired FHIR version, e.g., DSTU3, R4, R5
    }

    @Override
    public byte[] serialize(IBaseResource t) throws SerializationException {
        if (t == null) {
            return new byte[0];
        }
        try {
            String json = fhirContext.newJsonParser().encodeResourceToString(t);
            return json.getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new SerializationException("Could not serialize FHIR resource", e);
        }
    }

    @Override
    public IBaseResource deserialize(byte[] bytes) throws SerializationException {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        try {
            String json = new String(bytes, StandardCharsets.UTF_8);
            return fhirContext.newJsonParser().parseResource(json);
        } catch (Exception e) {
            throw new SerializationException("Could not deserialize FHIR resource", e);
        }
    }
}