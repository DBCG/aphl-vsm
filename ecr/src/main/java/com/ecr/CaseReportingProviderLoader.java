package com.ecr;

import ca.uhn.fhir.context.ConfigurationException;
import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.rest.server.provider.ResourceProviderFactory;
import com.ecr.r4.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

public class CaseReportingProviderLoader {
	private static final Logger myLogger = LoggerFactory.getLogger(CaseReportingProviderLoader.class);
	private final FhirContext myFhirContext;

	@Autowired
	ProcessMessageProvider myProcessMessageProvider;

	@Autowired
	MeasureDataProcessProvider myMeasureDataProcessProvider;

	@Autowired
	CaseReportingOperationProvider myCaseReportingOperationProvider;

	private final ResourceProviderFactory myResourceProviderFactory;

	public CaseReportingProviderLoader(FhirContext theFhirContext, ResourceProviderFactory theResourceProviderFactory) {
		myFhirContext = theFhirContext;
		myResourceProviderFactory = theResourceProviderFactory;
	}

	@EventListener(ContextRefreshedEvent.class)
	public void loadProvider() {
		switch (myFhirContext.getVersion().getVersion()) {
			case R4:
				myLogger.info("Registering R4 Ruler CaseReporting Providers");
				myResourceProviderFactory.addSupplier(() -> myMeasureDataProcessProvider);
				myResourceProviderFactory.addSupplier(() -> myProcessMessageProvider);
				myResourceProviderFactory.addSupplier(() -> myCaseReportingOperationProvider);
				break;
			default:
				throw new ConfigurationException("CaseReporting not supported for FHIR version "
						+ myFhirContext.getVersion().getVersion());
		}
	}
}
