package com.ecr;

import org.hl7.fhir.exceptions.FHIRException;

public class FhirResourceExists extends FHIRException {
	// Constructor without parameters
	public FhirResourceExists(String resourceType, String id) {
		super("The specified entity: " + resourceType + "/" + id + " already exists.");
	}
}
