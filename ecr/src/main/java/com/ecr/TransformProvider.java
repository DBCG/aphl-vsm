package com.ecr;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.hl7.fhir.instance.model.api.IBaseBundle;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IIdType;
import org.hl7.fhir.r4.model.BooleanType;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.Bundle.BundleEntryComponent;
import org.hl7.fhir.r4.model.CanonicalType;
import org.hl7.fhir.r4.model.CodeableConcept;
import org.hl7.fhir.r4.model.Coding;
import org.hl7.fhir.r4.model.Extension;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Library;
import org.hl7.fhir.r4.model.Meta;
import org.hl7.fhir.r4.model.MetadataResource;
import org.hl7.fhir.r4.model.PlanDefinition;
import org.hl7.fhir.r4.model.Reference;
import org.hl7.fhir.r4.model.RelatedArtifact;
import org.hl7.fhir.r4.model.Resource;
import org.hl7.fhir.r4.model.ResourceType;
import org.hl7.fhir.r4.model.UsageContext;
import org.hl7.fhir.r4.model.ValueSet;
import org.opencds.cqf.ruler.api.OperationProvider;
import org.springframework.beans.factory.annotation.Autowired;

import ca.uhn.fhir.model.api.annotation.Description;
import ca.uhn.fhir.rest.annotation.Operation;
import ca.uhn.fhir.rest.annotation.OperationParam;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;

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
	public Bundle importReportSpec(
		RequestDetails requestDetails,
		@OperationParam(name = "bundle") IBaseResource maybeBundle) throws UnprocessableEntityException {
		if (maybeBundle == null) {
			throw new UnprocessableEntityException("Resource is missing");
		}
		if (!(maybeBundle instanceof IBaseBundle)) {
			throw new UnprocessableEntityException("Resource is not a bundle");
		}
		Bundle v2Bundle = (Bundle) maybeBundle;

		// store for processing root library
		HashMap<String, ArrayList<CodeableConcept>> conditionsMap = new HashMap<>();
		HashMap<String, ArrayList<CodeableConcept>> priorityMap = new HashMap<>();
		List<String> groupers = new ArrayList<>();

		AtomicReference<PlanDefinition> planDefinition = new AtomicReference<>();
		AtomicReference<Library> rootLibrary = new AtomicReference<>();
		AtomicReference<Library> rctcLibrary = new AtomicReference<>();

		List<BundleEntryComponent> bundleEntries = new ArrayList<>();
		v2Bundle.getEntry().forEach(entry -> {
			if (entry.getResource() instanceof MetadataResource) {
				MetadataResource resource = (MetadataResource) entry.getResource();

				switch (resource.getResourceType()) {
					case ValueSet:
						ValueSet valueSet = (ValueSet) resource;
						String pinnedVersionKey = valueSet.getVersion() == null ? valueSet.getUrl() : valueSet.getUrl() + "|" + valueSet.getVersion();
						if (isGrouper(resource)) {
							groupers.add(pinnedVersionKey);
						} else {
							List<UsageContext> cleanedContext = valueSet.getUseContext().stream().filter(context -> {
								if (context.hasCode()) {
									String code = context.getCode().getCode();
									if (code.equals("focus")) {
										if (conditionsMap.containsKey(pinnedVersionKey)) {
											ArrayList<CodeableConcept> conditions = conditionsMap.get(pinnedVersionKey);
											conditions.add(context.getValueCodeableConcept());
										} else {
											conditionsMap.put(pinnedVersionKey, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
										}
										return false;
									} else if (code.equals("priority")) {
										if (priorityMap.containsKey(pinnedVersionKey)) {
											ArrayList<CodeableConcept> conditions = priorityMap.get(pinnedVersionKey);
											conditions.add(context.getValueCodeableConcept());
										} else {
											priorityMap.put(pinnedVersionKey, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
										}
										return false;
									}
								}
								return true;
							}).collect(Collectors.toList());
							valueSet.setUseContext(cleanedContext);
						}

						// Save the resource into entry bundle
//						bundleEntries.add(getPutResourceRequest(valueSet, "/ValueSet"));
						break;
					case Library:
						Library library = (Library) resource;
						if (!library.getUrl().contains("rctc")) {
							rootLibrary.set(library);
						} else {
							rctcLibrary.set(library);
						}
						break;
					case PlanDefinition:
						PlanDefinition planDef = (PlanDefinition) resource;
						planDefinition.set(planDef);
				}
			}
		});

		prepareRootLibrary(
			conditionsMap,
			priorityMap,
			planDefinition.get(),
			rctcLibrary.get(),
			groupers,
			rootLibrary
		);

		bundleEntries.add(getPutResourceRequest(rootLibrary.get(), "/Library"));
		bundleEntries.add(getPutResourceRequest(rctcLibrary.get(), "/Library"));
		bundleEntries.add(getPutResourceRequest(planDefinition.get(), "/PlanDefinition"));
		return saveImportTransactionBundle(bundleEntries);
	}

	private BundleEntryComponent getPutResourceRequest(MetadataResource value, String resourceType) {
		BundleEntryComponent bundleEntry = new BundleEntryComponent();

		Bundle.BundleEntryRequestComponent bundleRequest = new Bundle.BundleEntryRequestComponent();
		bundleRequest.setMethod(Bundle.HTTPVerb.POST);
		bundleRequest.setUrl(resourceType);
		bundleEntry.setRequest(bundleRequest);
		bundleEntry.setResource(value);
		bundleEntry.setFullUrl(value.getUrl());
		return bundleEntry;
	}

	private void prepareRootLibrary(
		HashMap<String, ArrayList<CodeableConcept>> conditionsMap,
		HashMap<String, ArrayList<CodeableConcept>> priorityMap,
		PlanDefinition planDefinition,
		Library rctcLibrary,
		List<String> groupers,
		AtomicReference<Library> rootLibrary
	) {
		List<CanonicalType> profiles = rootLibrary.get().getMeta().getProfile();

		// Add to profile and ensure unique
		profiles.add(new CanonicalType(TransformProperties.crmiManifestLibrary));
		profiles = profiles.stream()
			.filter(distinctByKey(CanonicalType::getValueAsString))
			.collect(Collectors.toList());
		rootLibrary.get().getMeta().setProfile(profiles);

		List<RelatedArtifact> relatedArtifacts = new ArrayList<>();

		groupers.forEach(grouper -> {
			RelatedArtifact relatedArtifact = new RelatedArtifact();
			relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
			relatedArtifact.setResource(grouper);
			relatedArtifacts.add(relatedArtifact);
		});

		// Set PlanDefinition
		RelatedArtifact relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifact.setResource(planDefinition.getUrl() + "|" + planDefinition.getVersion());
		Extension extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifact.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifact);

		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifact.setResource(planDefinition.getUrl() + "|" + planDefinition.getVersion());
		relatedArtifacts.add(relatedArtifact);

		// Set RCTC Library
		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifact.setResource(rctcLibrary.getUrl() + "|" + rctcLibrary.getVersion());
		extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifact.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifact);

		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifact.setResource(rctcLibrary.getUrl() + "|" + rctcLibrary.getVersion());
		relatedArtifacts.add(relatedArtifact);

		processCodeableConceptMapForLibrary(conditionsMap, TransformProperties.vsmCondition, relatedArtifacts);
		processCodeableConceptMapForLibrary(priorityMap, TransformProperties.vsmPriority, relatedArtifacts);
		rootLibrary.get().setRelatedArtifact(relatedArtifacts);
	}

	private static <T> Predicate<T> distinctByKey(Function<? super T, Object> keyExtractor) {
		Set<Object> seen = new HashSet<>();
		return t -> seen.add(keyExtractor.apply(t));
	}

	private void processCodeableConceptMapForLibrary(HashMap<String, ArrayList<CodeableConcept>> targetedMap, String extensionUrl, List<RelatedArtifact> relatedArtifacts) {
		for (Map.Entry<String, ArrayList<CodeableConcept>> entry : targetedMap.entrySet()) {
			String k = entry.getKey();
			ArrayList<CodeableConcept> v = entry.getValue();
			List<Extension> extensions = new ArrayList<>();
			v.forEach(codeableConcept -> {
				Extension extension = new Extension();
				extension.setUrl(extensionUrl);
				extension.setValue(codeableConcept);
				extensions.add(extension);
			});

			RelatedArtifact relatedArtifact = new RelatedArtifact();
			relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
			relatedArtifact.setResource(k);
			relatedArtifact.setExtension(extensions);

			relatedArtifacts.add(relatedArtifact);
		}
	}

	private Bundle saveImportTransactionBundle(List<BundleEntryComponent> bundleEntry) {
		Bundle importBundle = new Bundle();
		importBundle.setType(Bundle.BundleType.TRANSACTION);
		importBundle.setEntry(bundleEntry);

		transformProperties.transaction(importBundle);
		return importBundle;
	}

	/**
	 * Determines whether a given ValueSet is a grouper
	 * @param resource
	 * @return
	 */
	private boolean isGrouper(MetadataResource resource) {
		return resource.getResourceType() == ResourceType.ValueSet
			&& ((ValueSet) resource).hasCompose()
			&& ((ValueSet) resource).getCompose().getIncludeFirstRep().getValueSet().size() > 0;
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
			.filter(entry -> !(entry.getResource().hasMeta()
				&& entry.getResource().getMeta().hasProfile(TransformProperties.usPHSpecLibProfile)))
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
