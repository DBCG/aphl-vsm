package com.ecr;

import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.Extension;
import org.hl7.fhir.r4.model.Library;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.mockito.configuration.IMockitoConfiguration;
import org.opencds.cqf.ruler.test.RestIntegrationTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;

import static com.ecr.ImportBundleProducer.isRootSpecificationLibrary;
import static com.ecr.ImportBundleProducer.transformImportBundle;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = {
	TransformConfig.class }, properties = { "hapi.fhir.fhir_version=r4" })
public class TransformLibraryTest extends RestIntegrationTest {

	@Mock
	private TransformProperties transformProperties; // Your DAO to mock

	@BeforeEach
	public void setUp() {
		MockitoAnnotations.openMocks(this); // Initializes mocks
	}

	@Test
	public void testPrepareRootLibrary() throws FhirResourceExists {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");

		// Extract Root Library
		Library rootLibrary = extractRootLibrary(v2Bundle.getEntry());

		assertNull(rootLibrary.getRelatedArtifact().stream().filter(i -> {
					return i.getResource().equals("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506|1.0.0");
				})
				.findFirst()
				.orElse(null)
		);

		when(transformProperties.read(any())).thenThrow(new ResourceNotFoundException("Not Found"));

		List<Bundle.BundleEntryComponent> transactionBundleEntry = transformImportBundle(v2Bundle, transformProperties);

		Library updatedRootLibrary = extractRootLibrary(transactionBundleEntry);

		// TODO: more checks for priority and the other logic we are doing
		assertNotNull(updatedRootLibrary.getRelatedArtifact().stream().filter(i -> {
					return i.getResource().equals("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506|1.0.0");
				})
				.findFirst()
				.orElse(null)
		);
	}

	private Library extractRootLibrary(List<Bundle.BundleEntryComponent> bundleEntry) {
		Bundle.BundleEntryComponent rootLibraryEntry = bundleEntry.stream()
			.filter(entry -> entry.hasResource() && isRootSpecificationLibrary(entry.getResource()))
			.findFirst()
			.orElse(null);
		assert rootLibraryEntry != null;
		return (Library) rootLibraryEntry.getResource();
	}
}
