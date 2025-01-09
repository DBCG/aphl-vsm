package org.opencds.cqf.ruler;

import java.util.List;
import java.util.stream.Collectors;

import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;

import org.hl7.fhir.r4.model.*;
import org.hl7.fhir.r4.model.Bundle.BundleEntryComponent;
import org.junit.jupiter.api.Test;
import org.opencds.cqf.fhir.utility.Canonicals;
import org.opencds.cqf.ruler.ImportBundleProducer;
import org.opencds.cqf.ruler.TransformConfig;
import org.opencds.cqf.ruler.TransformProperties;
import org.opencds.cqf.ruler.test.RestIntegrationTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.*;

@DirtiesContext
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = {
		TransformConfig.class }, properties = { "hapi.fhir.fhir_version=r4" })
class TransformProviderIT extends RestIntegrationTest {
	@Test
	void testTransformConfig() {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
				.setName("bundle")
				.setResource(v2Bundle);
		Bundle v1Bundle = getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-to-v1-transform")
				.withParameters(v2BundleParams)
				.returnResourceType(Bundle.class)
				.execute();

		assertNotNull(v1Bundle);
		List<MetadataResource> entries = v1Bundle.getEntry().stream().map(entry -> (MetadataResource) entry.getResource()).collect(Collectors.toList());
		List<MetadataResource> ersdValueSets = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.ValueSet
				&& entry.hasMeta()
				&& entry.getMeta().hasProfile(TransformProperties.ersdVSProfile)).collect(Collectors.toList());
		List<MetadataResource> ersdValueSetLibrary = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.Library
				&& entry.hasMeta()
				&& entry.getMeta().hasProfile(TransformProperties.ersdVSLibProfile)).collect(Collectors.toList());
		List<MetadataResource> containsSpecificationLibrary = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.Library && entry.hasMeta()
				&& (entry.getMeta().hasProfile(TransformProperties.usPHSpecLibProfile) || entry.getUrl().equals("http://hl7.org/fhir/us/ecr/Library/SpecificationLibrary"))).collect(Collectors.toList());

		List<MetadataResource> containsV2PlanDefinition = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.PlanDefinition && entry.hasMeta()
				&& entry.getMeta().hasProfile(TransformProperties.ersdPlanDefinitionProfile) && !entry.getName().equals("PlanDefinition_eRSD_Skeleton_Instance")).collect(Collectors.toList());

		List<MetadataResource> VSTriggeringUseContextsMissingV1PlanDefinitionReference = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.ValueSet && entry.hasMeta() && entry.getMeta().hasProfile(TransformProperties.ersdVSProfile)
				&& entry.getUseContext().stream().anyMatch(useContext -> useContext.getCode().getCode().equals("program") && !useContext.getValueReference().getReference().equals("PlanDefinition/plandefinition-ersd-skeleton"))).collect(Collectors.toList());

		List<MetadataResource> containsV1PlanDefinition = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.PlanDefinition && entry.hasMeta()
				&& entry.getMeta().hasProfile(TransformProperties.ersdPlanDefinitionProfile) && entry.getName().equals("PlanDefinition_eRSD_Skeleton_Instance")).collect(Collectors.toList());
		List<BundleEntryComponent> planDefFullUrlUpdated = v1Bundle.getEntry().stream().filter(entry -> entry.getFullUrl().equals("http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-skeleton|1.2.0.0")).collect(Collectors.toList());
		List<MetadataResource> hasV2TriggeringVSLibUseContexts = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.Library && entry.hasMeta() && entry.getMeta().hasProfile(TransformProperties.ersdVSLibProfile)
				&& entry.getUseContext().stream().anyMatch(useContext ->
				(useContext.getCode().getCode().equals("reporting")
						&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "triggering"))
						|| (useContext.getCode().getCode().equals("specification-type")
						&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "value-set-library")))
		).collect(Collectors.toList());
		List<MetadataResource> hasV2TriggeringVSUseContexts = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.ValueSet && entry.hasMeta() && entry.getMeta().hasProfile(TransformProperties.ersdVSProfile)
				&& entry.getUseContext().stream().anyMatch(useContext ->
				(useContext.getCode().getCode().equals("reporting")
						&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "triggering"))
						|| (useContext.getCode().getCode().equals("priority")
						&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "routine")))
		).collect(Collectors.toList());
		List<MetadataResource> hasUSPHProfiles = entries.stream().filter(entry -> entry.getResourceType() == ResourceType.PlanDefinition && entry.hasMeta() && entry.getMeta().hasProfile()
				&& entry.getMeta().getProfile().stream().anyMatch(profile -> profile.getValueAsString().contains("us-ph"))).collect(Collectors.toList());
		List<MetadataResource> hasExperimental = entries.stream().filter(entry -> entry.hasExperimental()).collect(Collectors.toList());
		assertTrue(ersdValueSets.size() > 0);
		assertTrue(ersdValueSetLibrary.size() > 0);
		assertTrue(containsSpecificationLibrary.size() == 0);
		assertTrue(containsV2PlanDefinition.size() == 1);
		assertTrue(containsV1PlanDefinition.size() == 0);
		assertTrue(planDefFullUrlUpdated.size() == 0);
		assertTrue(VSTriggeringUseContextsMissingV1PlanDefinitionReference.size() == 6);
		assertTrue(hasV2TriggeringVSLibUseContexts.size() == 0);
		assertTrue(hasV2TriggeringVSUseContexts.size() == 0);
		assertTrue(hasUSPHProfiles.size() == 0);
		assertTrue(hasExperimental.size() == 0);
	}

	@Test
	void testTransform_alternate_v1_skeleton() {
		var planDef = (PlanDefinition) loadResource("ersd-v1-plandefinition-alternate.json");
		var v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");
		var v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
				.setName("bundle")
				.setResource(v2Bundle);
		v2BundleParams.addParameter()
				.setName("planDefinition")
				.setResource(planDef);
		var v1Bundle = getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-to-v1-transform")
				.withParameters(v2BundleParams)
				.returnResourceType(Bundle.class)
				.execute();
		var bundleContainsAlternatePlanDef = v1Bundle.getEntry().stream().filter(entry -> entry.getFullUrl().equals("http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-skeleton-alternate|1.2.0.0")).collect(Collectors.toList());
		assertEquals(1, bundleContainsAlternatePlanDef.size());
	}

	@Test
	void testTransform_set_targetVersion() {
		PlanDefinition planDef = (PlanDefinition) loadResource("ersd-v1-plandefinition-testversion.json");
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
				.setName("bundle")
				.setResource(v2Bundle);
		String testVersion = "test-version";
		v2BundleParams.addParameter()
				.setName("targetVersion")
				.setValue(new StringType(testVersion));
		v2BundleParams.addParameter()
				.setName("planDefinition")
				.setResource(planDef);
		Bundle v1Bundle = getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-to-v1-transform")
				.withParameters(v2BundleParams)
				.returnResourceType(Bundle.class)
				.execute();
		List<MetadataResource> resources = v1Bundle.getEntry().stream().map(entry -> (MetadataResource)entry.getResource()).collect(Collectors.toList());
		assertTrue(resources.stream().allMatch(res -> res.getVersion().equals(testVersion)));
	}

	@Test
	void testImportOperation() throws InterruptedException {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
			.setName("bundle")
			.setResource(v2Bundle);

		getClient()
			.operation()
			.onServer()
			.named("$ersd-v2-import")
			.withParameters(v2BundleParams)
			.returnResourceType(OperationOutcome.class)
			.execute();

		Thread.sleep(1000);

		int bundleSearchTries = 0;

		Bundle results = getClient().search()
				.forResource(ValueSet.class)
				.returnBundle(Bundle.class)
				.execute();

		while (results.getEntry().isEmpty() && bundleSearchTries < 3) {
			Thread.sleep(1500);
			bundleSearchTries++;
			results = getClient().search()
					.forResource(ValueSet.class)
					.returnBundle(Bundle.class)
					.execute();
		}

		if(results.getEntry().isEmpty()) {
			fail("Bundle is empty, fetching the import is not returning any entries");
		}

		List<ValueSet> exportedGroupers = v2Bundle.getEntry().stream()
				.filter(entry -> entry.getResource() instanceof MetadataResource && ImportBundleProducer.isGrouper((MetadataResource) entry.getResource()))
				.map(entry -> (ValueSet)entry.getResource())
				.collect(Collectors.toList());

		var importedGroupers = results.getEntry().stream()
				.filter(entry -> entry.getResource() instanceof MetadataResource && ImportBundleProducer.isGrouper((MetadataResource) entry.getResource()))
				.map(entry -> (ValueSet)entry.getResource())
				.collect(Collectors.toList());

		var groupersWithGroupTypeFromExportedBundle = exportedGroupers.stream()
				.filter(vs -> !ImportBundleProducer.isModelGrouperUseContextMissing(vs))
				.collect(Collectors.toList());

		var transformedGroupersWithGroupType = importedGroupers.stream()
				.filter(vs -> !ImportBundleProducer.isModelGrouperUseContextMissing(vs))
				.collect(Collectors.toList());

		importedGroupers.forEach(grouper -> {
			assertNull(grouper.getExpansion());
		});

		// Check there are 6 groupers to be imported and none of them have group type  as use context
		assertEquals(6,exportedGroupers.size());
		assertEquals(0, groupersWithGroupTypeFromExportedBundle.size());

		// After the import, check all of them have the group type as use context
		assertEquals(6,transformedGroupersWithGroupType.size());

		// Check that none of the valuesets have a v1 profile
		var valueSetHasV1 = results.getEntry().stream()
			.map(e -> (ValueSet)e.getResource())
			.anyMatch(vs -> vs.getMeta().getProfile().stream()
				.anyMatch(p -> p.getValue().equals(TransformProperties.ersdVSProfile)));
		assertFalse(valueSetHasV1);
		var valueSetLibrary = getClient().read().resource(Library.class).withId("library-rctc-example").execute();
		var valueSetLibraryHasV1 = valueSetLibrary.getMeta().getProfile().stream().anyMatch(p -> p.getValue().equals(TransformProperties.ersdVSLibProfile));
		assertFalse(valueSetLibraryHasV1);
		valueSetLibrary.getIdentifier().forEach(i -> {
			if (i.getSystem().equals("urn:ietf:rfc:3986") 
			&& i.hasValue()
			&& !i.getValue().startsWith("http")
			&& !i.getValue().startsWith("urn:oid")
			&& !i.getValue().startsWith("urn:uuid")
			&& Character.isDigit(i.getValue().charAt(0))) {
				fail("Invalid identifier present, should have been fixed by import");
			}
		});
	}

	@Test
	void testImportOperation_conflicting_priorities() {
		var v2Bundle = (Bundle) loadResource("ersd-bundle-example-conflicting-priority.json");
		var v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
			.setName("bundle")
			.setResource(v2Bundle);
		UnprocessableEntityException expectingPriorityConflict = null;
		
		try {
			getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-import")
				.withParameters(v2BundleParams)
				.returnResourceType(OperationOutcome.class)
				.execute();
		} catch (UnprocessableEntityException e) {
			expectingPriorityConflict = e;
		}
		assertNotNull(expectingPriorityConflict);
		assertTrue(expectingPriorityConflict.getMessage().contains("conflicting priorit"));
	}
	@Test
	void testImportOperation_handle_duplicate_priorities() throws InterruptedException {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example-2-priority.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
			.setName("bundle")
			.setResource(v2Bundle);

		getClient()
			.operation()
			.onServer()
			.named("$ersd-v2-import")
			.withParameters(v2BundleParams)
			.returnResourceType(OperationOutcome.class)
			.execute();

		int bundleSearchTries = 0;

		Library library = null;

		while (library == null && bundleSearchTries < 3) {
			Thread.sleep(1500);
			bundleSearchTries++;
			try {
				library = getClient().read().resource(Library.class).withId("SpecificationLibrary").execute();
			} catch (ResourceNotFoundException e) {
				// do nothing
			}
		}

		if(library == null) {
			fail("Library not found, fetching the import is not returning the manifest library");
		}
		var atLeastOneRelatedArtifactIsAValueSetWithPriority = false;
		for (final var ra: library.getRelatedArtifact()) {
			if (Canonicals.getResourceType(ra.getResource()).equals("ValueSet") && ra.hasExtension(TransformProperties.vsmPriority)) {
				atLeastOneRelatedArtifactIsAValueSetWithPriority = true;
				assertEquals(1, ra.getExtensionsByUrl(TransformProperties.vsmPriority).size());
			}
		}
		assertTrue(atLeastOneRelatedArtifactIsAValueSetWithPriority);
	}

	@Test
	void testImportOperation_appliesGrouperUseContext() throws InterruptedException {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example-missing-grouper-use-context.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
				.setName("bundle")
				.setResource(v2Bundle);

		getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-import")
				.withParameters(v2BundleParams)
				.returnResourceType(OperationOutcome.class)
				.execute();

		Thread.sleep(1000);

		int bundleSearchTries = 0;

		Bundle results = getClient().search()
				.forResource(ValueSet.class)
				.returnBundle(Bundle.class)
				.execute();

		while (results.getEntry().isEmpty() && bundleSearchTries < 3) {
			Thread.sleep(1500);
			bundleSearchTries++;
			results = getClient().search()
					.forResource(ValueSet.class)
					.returnBundle(Bundle.class)
					.execute();
		}

		if(results.getEntry().isEmpty()) {
			fail("Bundle is empty, fetching the import is not returning any entries");
		}

		List<ValueSet> importedGroupers = results.getEntry().stream()
				.filter(entry -> entry.getResource() instanceof MetadataResource && ImportBundleProducer.isGrouper((MetadataResource) entry.getResource()))
				.map(entry -> (ValueSet)entry.getResource())
				.collect(Collectors.toList());

		// After the import, check all of them have the group type as use context
		assertEquals(6,importedGroupers.size());
	}

	@Test
	void testImportOperationRemoveErsdValueset() throws InterruptedException {
		Bundle v2Bundle = (Bundle) loadResource("ersd-bundle-example-v1-vs.json");
		Parameters v2BundleParams = new Parameters();
		v2BundleParams.addParameter()
				.setName("bundle")
				.setResource(v2Bundle);

		getClient()
				.operation()
				.onServer()
				.named("$ersd-v2-import")
				.withParameters(v2BundleParams)
				.returnResourceType(OperationOutcome.class)
				.execute();

		Thread.sleep(1000);

		int bundleSearchTries = 0;

		Bundle results = getClient().search()
				.forResource(ValueSet.class)
				.returnBundle(Bundle.class)
				.execute();

		while (results.getEntry().isEmpty() && bundleSearchTries < 3) {
			Thread.sleep(1500);
			bundleSearchTries++;
			results = getClient().search()
					.forResource(ValueSet.class)
					.returnBundle(Bundle.class)
					.execute();
		}

		if (results.getEntry().isEmpty()) {
			fail("Bundle is empty, fetching the import is not returning any entries");
		}

		List<ValueSet> exportedGroupers = v2Bundle.getEntry().stream()
				.filter(entry -> entry.getResource() instanceof MetadataResource && ImportBundleProducer.isGrouper((MetadataResource) entry.getResource()))
				.map(entry -> (ValueSet) entry.getResource())
				.collect(Collectors.toList());

		var exportedDxtc = exportedGroupers.stream().filter(vs -> vs.getUrl().contains("dxtc")).collect(Collectors.toList()).get(0);
		assertEquals(1, (int) exportedDxtc.getMeta().getProfile().stream().filter(p -> p.getValue().equals(TransformProperties.ersdVSProfile)).count());

		List<ValueSet> importedGroupers = results.getEntry().stream()
				.filter(entry -> entry.getResource() instanceof MetadataResource && ImportBundleProducer.isGrouper((MetadataResource) entry.getResource()))
				.map(entry -> (ValueSet)entry.getResource())
				.collect(Collectors.toList());

		var importedDxtc = importedGroupers.stream().filter(vs -> vs.getUrl().contains("dxtc")).collect(Collectors.toList()).get(0);
		assertEquals(0, (int) importedDxtc.getMeta().getProfile().stream().filter(p -> p.getValue().equals(TransformProperties.ersdVSProfile)).count());

	}
}
