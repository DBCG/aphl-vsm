package org.opencds.cqf.ruler;

import org.hl7.fhir.exceptions.FHIRException;

public class FhirResourceExists extends FHIRException {
	// Constructor without parameters
	public FhirResourceExists(String resourceType, String url, String version) {
		super("The specified entity: " + resourceType + " with " + url + " and version: " + version + " already exists.");
	}
}
