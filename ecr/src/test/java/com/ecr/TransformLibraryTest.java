package com.ecr;

import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.CodeableConcept;
import org.hl7.fhir.r4.model.Library;
import org.hl7.fhir.r4.model.RelatedArtifact;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.opencds.cqf.ruler.test.RestIntegrationTest;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.ecr.ImportBundleProducer.isRootSpecificationLibrary;
import static com.ecr.ImportBundleProducer.transformImportBundle;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

		assertFalse(rootLibrary.getRelatedArtifact().stream().filter(i -> i.getResource().equals("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506|1.0.0"))
			.findFirst()
			.isPresent()
		);

		when(transformProperties.read(any())).thenThrow(new ResourceNotFoundException("Not Found"));

		List<Bundle.BundleEntryComponent> transactionBundleEntry = transformImportBundle(v2Bundle, transformProperties);

		Library updatedRootLibrary = extractRootLibrary(transactionBundleEntry);

		List<RelatedArtifact> ra = updatedRootLibrary
			.getRelatedArtifact()
			.stream()
			.filter(i -> i.getResource().equals("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506|1.0.0"))
			.collect(Collectors.toList());
		assertTrue(!ra.isEmpty());

		CodeableConcept conditionCodeableConcept = (CodeableConcept) ra.get(0).getExtension().get(0).getValue();
		assertEquals(conditionCodeableConcept.getText(), "Infection caused by Acanthamoeba (disorder)");

		CodeableConcept priorityCodeableConcept = (CodeableConcept) ra.get(1).getExtension().get(0).getValue();
		assertEquals(priorityCodeableConcept.getCoding().get(0).getCode(), "routine");
	}

	private Library extractRootLibrary(List<Bundle.BundleEntryComponent> bundleEntry) {
		Optional<IBaseResource> rootLibraryEntry = bundleEntry.stream()
			.filter(entry -> entry.hasResource() && isRootSpecificationLibrary(entry.getResource()))
			.findFirst()
			.map(Bundle.BundleEntryComponent::getResource);
		assertTrue(rootLibraryEntry.isPresent());
		return (Library) rootLibraryEntry.get();
	}
}
