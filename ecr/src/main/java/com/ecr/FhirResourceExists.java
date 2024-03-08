package com.ecr;

public class FhirResourceExists extends Exception {
	// Constructor without parameters
	public FhirResourceExists(String resourceType, String id) {
		super("The specified entity: " + resourceType + "/" + id + " already exists.");
	}
}
