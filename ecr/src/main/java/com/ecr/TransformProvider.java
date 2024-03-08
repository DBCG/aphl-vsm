package com.ecr;

import ca.uhn.fhir.model.api.annotation.Description;
import ca.uhn.fhir.rest.annotation.Operation;
import ca.uhn.fhir.rest.annotation.OperationParam;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;
import org.hl7.fhir.instance.model.api.IBaseBundle;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IIdType;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.Bundle.BundleEntryComponent;
import org.hl7.fhir.r4.model.CanonicalType;
import org.hl7.fhir.r4.model.Coding;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Meta;
import org.hl7.fhir.r4.model.MetadataResource;
import org.hl7.fhir.r4.model.OperationOutcome;
import org.hl7.fhir.r4.model.PlanDefinition;
import org.hl7.fhir.r4.model.Reference;
import org.hl7.fhir.r4.model.ResourceType;
import org.hl7.fhir.r4.model.UsageContext;
import org.hl7.fhir.r4.model.ValueSet;
import org.opencds.cqf.ruler.api.OperationProvider;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.ecr.ImportBundleProducer.isGrouper;
import static com.ecr.ImportBundleProducer.isRootSpecificationLibrary;
import static com.ecr.ImportBundleProducer.transformImportBundle;

public class TransformProvider implements OperationProvider {
	@Autowired
	TransformProperties transformProperties;

	/**
	 * Implements the $ersd-v2-to-v1-transform operation which transforms an ersd v2
	 * Bundle
	 * into an ersd v1 compatible bundle
	 *
	 * @param requestDetails      the incoming request details
	 * @param maybeBundle         the v2 bundle to transform
	 * @param maybePlanDefinition the v1 PlanDefinition to include
	 * @return the v1 compatible bundle
	 */
	@Description(shortDefinition = "Converts a v2 ERSD bundle into a v1 ERSD bundle", value = "Converts a v2 ERSD bundle into a v1 ERSD bundle")
	@Operation(idempotent = true, name = "$ersd-v2-to-v1-transform")
	public Bundle convert_v1(
		RequestDetails requestDetails,
		@OperationParam(name = "bundle") IBaseResource maybeBundle,
		@OperationParam(name = "planDefinition") IBaseResource maybePlanDefinition,
		@OperationParam(name = "targetVersion") String targetVersion) throws UnprocessableEntityException {
		if (maybeBundle == null) {
			throw new UnprocessableEntityException("Resource is missing");
		}
		if (!(maybeBundle instanceof IBaseBundle)) {
			throw new UnprocessableEntityException("Resource is not a bundle");
		}
		if (maybePlanDefinition != null && !(maybePlanDefinition instanceof PlanDefinition)) {
			throw new UnprocessableEntityException("Provided v1 PlanDefinition is not a PlanDefinition resource");
		}
		Bundle v2Bundle = (Bundle) maybeBundle;
		final PlanDefinition v1PlanDefinition = (PlanDefinition) maybePlanDefinition;
		IdType targetPlanDefinitionId = v1PlanDefinition != null ? v1PlanDefinition.getIdElement()
			: getCurrentPlanDefinition(v2Bundle).getIdElement();

		removeRootSpecificationLibrary(v2Bundle);
		v2Bundle.getEntry().stream()
			.forEach(entry -> {
				if (entry.getResource() instanceof MetadataResource) {
					MetadataResource resource = (MetadataResource) entry.getResource();

					if (v1PlanDefinition != null && isPlanDefinitionAndConformsToProfile(resource, TransformProperties.usPHPlanDefinitionProfile)) {
						checkAndUpdateV2PlanDefinition(entry, v1PlanDefinition);
					}

					updateV2GroupersUseContext(resource, targetPlanDefinitionId);
					updateV2TriggeringValueSets(resource);
					updateV2TriggeringValueSetLibrary(resource);
					resource.setExperimentalElement(null);
					if (targetVersion != null) {
						resource.setVersion(targetVersion);
					}
				}
			});

		return v2Bundle;
	}
	
	private boolean isPlanDefinitionAndConformsToProfile(Resource resource, String profileUrl) {
		return resource.getResourceType() == ResourceType.PlanDefinition
			&& resource.hasMeta()
			&& resource.getMeta().hasProfile()
			&& resource.getMeta().getProfile().stream().anyMatch(canonical -> canonical.getValue().equalsIgnoreCase(profileUrl));
	}

	@Description(shortDefinition = "Imports a v2 ERSD bundle", value = "Imports a v2 ERSD bundle")
	@Operation(idempotent = true, name = "$ersd-v2-import")
	public OperationOutcome importReportSpec(
		RequestDetails requestDetails,
		@OperationParam(name = "bundle") IBaseResource maybeBundle) throws UnprocessableEntityException, FhirResourceExists {
		if (maybeBundle == null) {
			throw new UnprocessableEntityException("Resource is missing");
		}
		if (!(maybeBundle instanceof IBaseBundle)) {
			throw new UnprocessableEntityException("Resource is not a bundle");
		}
		Bundle v2Bundle = (Bundle) maybeBundle;
		List<Bundle.BundleEntryComponent> importTxBundleEntries = transformImportBundle(v2Bundle, transformProperties);

		new Thread(() -> {
			executeImportTransactionBundle(importTxBundleEntries);
		}).start();
		OperationOutcome response = new OperationOutcome();
		OperationOutcome.OperationOutcomeIssueComponent issue = new OperationOutcome.OperationOutcomeIssueComponent();
		issue.setSeverity(OperationOutcome.IssueSeverity.INFORMATION);
		issue.setCode(OperationOutcome.IssueType.PROCESSING);

		response.addIssue(issue);
		return response;
	}

	private Bundle executeImportTransactionBundle(List<BundleEntryComponent> bundleEntry) {
		Bundle importBundle = new Bundle();
		importBundle.setType(Bundle.BundleType.TRANSACTION);
		importBundle.setEntry(bundleEntry);
		return transformProperties.transaction(importBundle);
	}

	private void updateV2GroupersUseContext(MetadataResource resource, IIdType planDefinitionId) {
		// if resource is a ValueSet
		if (isGrouper(resource)) {
			ValueSet valueSet = (ValueSet) resource;
			// if ValueSet is a grouper
			List<UsageContext> usageContexts = valueSet.getUseContext();
			UsageContext program = usageContexts.stream()
				.filter(useContext -> useContext.getCode().getSystem().equals(TransformProperties.hl7UsageContextType)
					&& useContext.getCode().getCode().equals("program"))
				.findFirst().orElseGet(() -> {
					UsageContext retval = new UsageContext(
						new Coding(TransformProperties.hl7UsageContextType, "program", null), null);
					usageContexts.add(retval);
					return retval;
				});
			program.setValue(new Reference(planDefinitionId));
		}
	}

	private void removeRootSpecificationLibrary(Bundle v2) {
		List<BundleEntryComponent> filteredRootLib = v2.getEntry().stream()
			.filter(entry -> entry.hasResource())
			.filter(entry -> !isRootSpecificationLibrary(entry.getResource()))
			.collect(Collectors.toList());
		v2.setEntry(filteredRootLib);
	}

	private void checkAndUpdateV2PlanDefinition(BundleEntryComponent entry, PlanDefinition v1PlanDefinition) throws UnprocessableEntityException{
		if (entry.hasResource() && isPlanDefinitionAndConformsToProfile(entry.getResource(), TransformProperties.usPHPlanDefinitionProfile)) {
			entry.setResource(v1PlanDefinition);
			String url = Optional.ofNullable(v1PlanDefinition.getUrl())
				.orElseThrow(() -> new UnprocessableEntityException("URL missing from PlanDefinition"));
			String version = Optional.ofNullable(v1PlanDefinition.getVersion())
				.orElseThrow(() -> new UnprocessableEntityException("Version missing from PlanDefinition"));
			entry.setFullUrl(url + "|" + version);
		}
	}

	/**
	 * Remove all instances of an old profile and add one instance of a new profile
	 *
	 * @param meta       the meta object to update
	 * @param oldProfile the profile URL to remove
	 * @param newProfile the profile URL to add
	 */
	private void replaceProfile(Meta meta, String oldProfile, String newProfile) {
		// remove all instances of old profile
		List<CanonicalType> updatedProfiles = meta.getProfile().stream()
			.filter(profile -> !profile.getValue().equals(oldProfile)).collect(Collectors.toList());
		// add the new profile if it doesn't exist
		if (!updatedProfiles.stream().anyMatch(profile -> profile.getValue().equals(newProfile))) {
			updatedProfiles.add(new CanonicalType(newProfile));
		}
		meta.setProfile(updatedProfiles);
	}

	private void updateV2TriggeringValueSetLibrary(MetadataResource resource) {
		if (resource.getResourceType() == ResourceType.Library
			&& resource.hasMeta()
			&& resource.getMeta().hasProfile(TransformProperties.usPHTriggeringVSLibProfile)) {
			replaceProfile(resource.getMeta(), TransformProperties.usPHTriggeringVSLibProfile,
				TransformProperties.ersdVSLibProfile);
			List<UsageContext> filteredUseContexts = resource.getUseContext().stream()
				.filter(useContext -> !(useContext.getCode().getCode().equals("reporting")
					&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "triggering"))
					&& !(useContext.getCode().getCode().equals("specification-type")
					&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext,
					"value-set-library")))
				.collect(Collectors.toList());
			resource.setUseContext(filteredUseContexts);
		}
	}

	private void updateV2TriggeringValueSets(MetadataResource resource) {
		if (resource.getResourceType() == ResourceType.ValueSet
			&& resource.hasMeta()
			&& resource.getMeta().hasProfile(TransformProperties.usPHTriggeringVSProfile)) {
			replaceProfile(resource.getMeta(), TransformProperties.usPHTriggeringVSProfile,
				TransformProperties.ersdVSProfile);
			List<UsageContext> filteredUseContexts = resource.getUseContext().stream()
				.filter(useContext -> !(useContext.getCode().getCode().equals("reporting")
					&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "triggering"))
					&& !(useContext.getCode().getCode().equals("priority")
					&& useContext.getValueCodeableConcept().hasCoding(TransformProperties.usPHUsageContext, "routine")))
				.collect(Collectors.toList());
			resource.setUseContext(filteredUseContexts);
		}
	}

	private static PlanDefinition getCurrentPlanDefinition(Bundle bundle) throws UnprocessableEntityException {
		List<PlanDefinition> planDefinitions = bundle.getEntry().stream()
				.map(BundleEntryComponent::getResource)
				.filter(resource -> resource.getResourceType() == ResourceType.PlanDefinition
					&& resource.hasMeta()
					&& resource.getMeta().getProfile().stream().anyMatch(canonical -> canonical.getValue().contains(TransformProperties.usPHPlanDefinitionProfile))
				)
				.map(resource -> (PlanDefinition) resource)
				.collect(Collectors.toList());

		if (planDefinitions.isEmpty()) {
			throw new UnprocessableEntityException("No eRSD PlanDefinition found in the source Bundle.");
		} else if (planDefinitions.size() > 1) {
			throw new UnprocessableEntityException("More than one eRSD PlanDefinition found in the source Bundle.");
		}

		return planDefinitions.get(0);
	}
}
