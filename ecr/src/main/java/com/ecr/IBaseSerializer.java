package com.ecr;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import org.hl7.fhir.instance.model.api.IBase;

import java.io.IOException;

public class IBaseSerializer extends StdSerializer<IBase> {
	private final IParser myParser;

	public IBaseSerializer(FhirContext theFhirContext) {
		super(IBase.class);
		myParser = theFhirContext.newJsonParser().setPrettyPrint(true);
	}

	@Override
	public void serialize(IBase theResource, JsonGenerator theJsonGenerator, SerializerProvider theProvider)
			throws IOException {
		String resourceJson = myParser.encodeToString(theResource);
		theJsonGenerator.writeRawValue(resourceJson);
	}
}
