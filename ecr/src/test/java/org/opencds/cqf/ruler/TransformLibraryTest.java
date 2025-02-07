package org.opencds.cqf.ruler;

import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.opencds.cqf.ruler.test.RestIntegrationTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.opencds.cqf.ruler.ImportBundleProducer.isRootSpecificationLibrary;
import static org.opencds.cqf.ruler.ImportBundleProducer.transformImportBundle;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;


@DirtiesContext
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = {
	TransformConfig.class }, properties = { "hapi.fhir.fhir_version=r4" })
public class TransformLibraryTest extends RestIntegrationTest {

	@Mock
	private TransformProperties transformProperties; // Your DAO to mock

	@BeforeEach
	public void setUp() {
		MockitoAnnotations.openMocks(this); // Initializes mocks
	}

	/**
	 * @throws FhirResourceExists
	 */
	@Test
	void testRootLibraryImport() throws FhirResourceExists {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");
		String targetedValueSetUrl = "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506";
		String targetedPinnedValueSetVersion = "1.0.0";

		// Extract Root Library
		Library rootLibrary = extractRootLibrary(v2Bundle.getEntry());

		// Assert state before pre-import conformance
		assertFalse(rootLibrary.getRelatedArtifact()
			.stream()
			.anyMatch(i -> i.getResource().equals(targetedValueSetUrl + "|" + targetedPinnedValueSetVersion))
		);

		// Extract targeted ValueSet to check for import conformance
		Optional<Bundle.BundleEntryComponent> preImportBundleEntry = v2Bundle.getEntry().stream()
			.filter(i -> i.getFullUrl().equals(targetedValueSetUrl))
			.findFirst();

		ValueSet preImportValueSet = (ValueSet) preImportBundleEntry.get().getResource();

		assertFalse(preImportValueSet.getMeta().getProfile().containsAll(Arrays.asList(TransformProperties.leafValueSetVsmHostedProfile, TransformProperties.leafValueSetConditionProfile)));
		assertTrue(preImportValueSet.getUseContext().stream().anyMatch(i -> i.getCode().getCode().equals("focus") || i.getCode().getCode().equals("priority")));
		assertNotNull(preImportValueSet);

		// ensures that resources not found when doing checks
		when(transformProperties.search(any(), any())).thenThrow(new ResourceNotFoundException("Not Found"));

		List<Bundle.BundleEntryComponent> transactionBundleEntry = transformImportBundle(v2Bundle, transformProperties, "http://localhost:8080/fhir");

		Library updatedRootLibrary = extractRootLibrary(transactionBundleEntry);

		List<RelatedArtifact> ra = updatedRootLibrary
			.getRelatedArtifact()
			.stream()
			.filter(i -> i.getResource().equals(targetedValueSetUrl + "|" + targetedPinnedValueSetVersion))
			.collect(Collectors.toList());
		assertTrue(!ra.isEmpty());

		List<RelatedArtifact> pds = updatedRootLibrary
			.getRelatedArtifact()
			.stream()
			.filter(i -> i.getType().equals(RelatedArtifact.RelatedArtifactType.COMPOSEDOF))
			.filter(i -> i.getResourceElement().asStringValue().equals("http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-instance-example|0.1"))
			.collect(Collectors.toList());
		assertEquals(1, pds.size());
		assertTrue(pds.get(0).hasExtension("http://hl7.org/fhir/StructureDefinition/artifact-isOwned"));


		CodeableConcept conditionCodeableConcept = (CodeableConcept) ra.get(0).getExtension().get(0).getValue();
		assertEquals(conditionCodeableConcept.getText(), "Infection caused by Acanthamoeba (disorder)");

		CodeableConcept priorityCodeableConcept = (CodeableConcept) ra.get(0).getExtension().get(1).getValue();
		assertEquals(priorityCodeableConcept.getCoding().get(0).getCode(), "routine");

		// Extract targeted ValueSet to check for post-import conformance
		Optional<Bundle.BundleEntryComponent> postImportBundleEntry = transactionBundleEntry.stream()
			.filter(i -> i.getFullUrl().equals(targetedValueSetUrl))
			.findFirst();

		ValueSet postImportVs = (ValueSet) postImportBundleEntry.get().getResource();

		List<String> profileStrings = postImportVs.getMeta().getProfile().stream().map(PrimitiveType::getValueAsString).collect(Collectors.toList());
		assertTrue(profileStrings.containsAll(Arrays.asList(TransformProperties.leafValueSetVsmHostedProfile, TransformProperties.leafValueSetConditionProfile)));
		assertFalse(postImportVs.getUseContext().stream().anyMatch(i -> i.getCode().getCode().equals("focus") || i.getCode().getCode().equals("priority")));
		assertNotNull(postImportVs);
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
