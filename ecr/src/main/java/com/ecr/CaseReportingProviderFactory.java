package com.ecr;


import ca.uhn.fhir.context.ConfigurationException;
import ca.uhn.fhir.context.FhirContext;
import com.ecr.r4.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

public class CaseReportingProviderFactory {
	@Autowired 
	private FhirContext myFhirContext;

	@Autowired
	private ApplicationContext myApplicationContext;

	public Object getMeasureDataProcessProvider() {
		switch (myFhirContext.getVersion().getVersion()) {
			case R4:
				return myApplicationContext.getBean(MeasureDataProcessProvider.class);
			default:
				throw new ConfigurationException("MeasureDataProcessProvider not supported for FHIR version "
					+ myFhirContext.getVersion().getVersion());
		}
	}

	public Object getProcessMessageProvider() {
		switch (myFhirContext.getVersion().getVersion()) {
			case R4:
				return myApplicationContext
					.getBean(ProcessMessageProvider.class);
			default:
				throw new ConfigurationException("ProcessMessageProvider not supported for FHIR version "
					+ myFhirContext.getVersion().getVersion());
		}
	}
}
