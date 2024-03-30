package com.ecr;

import org.hl7.fhir.r4.model.BooleanType;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.CanonicalType;
import org.hl7.fhir.r4.model.CodeableConcept;
import org.hl7.fhir.r4.model.Extension;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Library;
import org.hl7.fhir.r4.model.MetadataResource;
import org.hl7.fhir.r4.model.PlanDefinition;
import org.hl7.fhir.r4.model.RelatedArtifact;
import org.hl7.fhir.r4.model.Resource;
import org.hl7.fhir.r4.model.ResourceType;
import org.hl7.fhir.r4.model.UriType;
import org.hl7.fhir.r4.model.UsageContext;
import org.hl7.fhir.r4.model.ValueSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class ImportBundleProducer {

	private static final Logger myLogger = LoggerFactory.getLogger(ImportBundleProducer.class);


	/**
	 * Determines whether a given ValueSet is a grouper
	 * @param resource
	 * @return
	 */
	public static boolean isGrouper(MetadataResource resource) {
		return resource.getResourceType() == ResourceType.ValueSet
			&& ((ValueSet) resource).hasCompose()
			&& ((ValueSet) resource).getCompose().getIncludeFirstRep().getValueSet().size() > 0;
	}

	public static boolean isRootSpecificationLibrary(Resource resource) {
		return resource.hasMeta() && resource.getMeta().hasProfile(TransformProperties.usPHSpecLibProfile);
	}

	public static List<Bundle.BundleEntryComponent> transformImportBundle(Bundle parameterBundle, TransformProperties transformProperties) throws FhirResourceExists {
		// store for processing root library
		HashMap<String, List<CodeableConcept>> conditionsMap = new HashMap<>();
		HashMap<String, List<CodeableConcept>> priorityMap = new HashMap<>();
		List<String> groupers = new ArrayList<>();

		PlanDefinition planDefinition = null;
		Library rootLibrary = null;
		Library rctcLibrary = null;

		List<Bundle.BundleEntryComponent> bundleEntries = new ArrayList<>();
		List<Bundle.BundleEntryComponent> entries = parameterBundle.getEntry();
		for (int i = 0; i < entries.size() - 1; i++) {
			Bundle.BundleEntryComponent entry = entries.get(i);
			if (entry.getResource() instanceof MetadataResource) {
				MetadataResource resource = (MetadataResource) entry.getResource();

				switch (resource.getResourceType()) {
					case ValueSet:
						ValueSet valueSet = (ValueSet) resource;
						String pinnedVersionKey = valueSet.getVersion() == null ? valueSet.getUrl() : valueSet.getUrl() + "|" + valueSet.getVersion();
						if (isGrouper(resource)) {
							groupers.add(pinnedVersionKey);
						} else {
							valueSet.getUseContext().forEach(context -> {
								if (context.hasCode()) {
									String code = context.getCode().getCode();
									if (code.equals("focus")) {
										if (conditionsMap.containsKey(pinnedVersionKey)) {
											List<CodeableConcept> conditions = conditionsMap.get(pinnedVersionKey);
											conditions.add(context.getValueCodeableConcept());
										} else {
											conditionsMap.put(pinnedVersionKey, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
										}
									} else if (code.equals("priority")) {
										if (priorityMap.containsKey(pinnedVersionKey)) {
											List<CodeableConcept> priorities = priorityMap.get(pinnedVersionKey);
											priorities.add(context.getValueCodeableConcept());
										} else {
											priorityMap.put(pinnedVersionKey, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
										}
									}
								}
							});

							List<UsageContext> cleanedContext = valueSet.getUseContext().stream().filter(UsageContext::hasCode).collect(Collectors.toList());
							valueSet.setUseContext(cleanedContext);

							if (valueSet.getExtensionByUrl(TransformProperties.authoritativeSourceExtUrl) == null) {
								Extension ext = new Extension();
								ext.setUrl(TransformProperties.authoritativeSourceExtUrl);
								ext.setValue(new UriType(TransformProperties.vsacUrl));
								valueSet.getExtension().add(ext);
							}
						}

						// Check if ValueSet already exists
						if (!doesResourceExist(valueSet.getIdElement(), transformProperties)) {
							// Save the resource into entry bundle
							bundleEntries.add(getPutResourceRequest(valueSet, "/ValueSet", valueSet.getIdPart()));
						}
						break;
					case Library:
						Library library = (Library) resource;
						if (doesResourceExist(library.getIdElement(), transformProperties)) {
							throw new FhirResourceExists("Library", library.getIdPart());
						} else {
							if (isRootSpecificationLibrary(resource)) {
								rootLibrary = library;
							} else {
								rctcLibrary = library;
							}
						}
						break;
					case PlanDefinition:
						planDefinition = (PlanDefinition) resource;
					default:
						myLogger.info("resourceType:  "+ resource.getResourceType() +" is not supported by $import operation");
				}
			}
		}

		prepareRootLibrary(
			conditionsMap,
			priorityMap,
			planDefinition,
			rctcLibrary,
			groupers,
			rootLibrary
		);

		bundleEntries.add(getPutResourceRequest(rootLibrary, "/Library", rootLibrary.getIdPart()));
		bundleEntries.add(getPutResourceRequest(rctcLibrary, "/Library", rctcLibrary.getIdPart()));
		bundleEntries.add(getPutResourceRequest(planDefinition, "/PlanDefinition", planDefinition.getIdPart()));
		return bundleEntries;
	}

	private static boolean doesResourceExist(IdType idType, TransformProperties transformProperties) {
		try {
			transformProperties.read(idType);
			return true;
		} catch(Exception e) {
			return false;
		}
	}


	private static Bundle.BundleEntryComponent getPutResourceRequest(MetadataResource value, String resourceType, String id) {
		Bundle.BundleEntryComponent bundleEntry = new Bundle.BundleEntryComponent();

		Bundle.BundleEntryRequestComponent bundleRequest = new Bundle.BundleEntryRequestComponent();
		bundleRequest.setMethod(Bundle.HTTPVerb.PUT);
		bundleRequest.setUrl(resourceType + "?_id=" + id);
		bundleEntry.setRequest(bundleRequest);
		bundleEntry.setResource(value);
		bundleEntry.setFullUrl(value.getUrl());
		return bundleEntry;
	}

	private static void prepareRootLibrary(
		HashMap<String, List<CodeableConcept>> conditionsMap,
		HashMap<String, List<CodeableConcept>> priorityMap,
		PlanDefinition planDefinition,
		Library rctcLibrary,
		List<String> groupers,
		Library rootLibrary
	) {
		List<CanonicalType> profiles = rootLibrary.getMeta().getProfile();

		// Add to profile and ensure not duplicated
		profiles.add(new CanonicalType(TransformProperties.crmiManifestLibrary));
		profiles = profiles.stream()
			.filter(distinctByKey(CanonicalType::getValueAsString))
			.collect(Collectors.toList());
		rootLibrary.getMeta().setProfile(profiles);

		List<RelatedArtifact> relatedArtifacts = new ArrayList<>();

		groupers.forEach(grouper -> {
			RelatedArtifact relatedArtifact = new RelatedArtifact();
			relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
			relatedArtifact.setResource(grouper);
			relatedArtifacts.add(relatedArtifact);
		});

		// Set PlanDefinition
		String planDefResourceUrl = planDefinition.getVersion() != null ? planDefinition.getUrl() + "|" + planDefinition.getVersion() : planDefinition.getUrl();
		RelatedArtifact relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifact.setResource(planDefResourceUrl);
		Extension extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifact.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifact);

		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifact.setResource(planDefResourceUrl);
		relatedArtifacts.add(relatedArtifact);

		// Set rctc Library
		String rctcUrl = rctcLibrary.getVersion() != null ? rctcLibrary.getUrl() + "|" + rctcLibrary.getVersion() : rctcLibrary.getUrl();
		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifact.setResource(rctcUrl);
		extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifact.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifact);

		relatedArtifact = new RelatedArtifact();
		relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifact.setResource(rctcUrl);
		relatedArtifacts.add(relatedArtifact);

		processCodeableConceptMapForLibrary(conditionsMap, TransformProperties.vsmCondition, relatedArtifacts);
		processCodeableConceptMapForLibrary(priorityMap, TransformProperties.vsmPriority, relatedArtifacts);
		rootLibrary.setRelatedArtifact(relatedArtifacts);
	}

	private static <T> Predicate<T> distinctByKey(Function<? super T, Object> keyExtractor) {
		Set<Object> seen = new HashSet<>();
		return t -> seen.add(keyExtractor.apply(t));
	}

	private static void processCodeableConceptMapForLibrary(HashMap<String, List<CodeableConcept>> targetedMap, String extensionUrl, List<RelatedArtifact> relatedArtifacts) {
		for (Map.Entry<String, List<CodeableConcept>> entry : targetedMap.entrySet()) {
			String k = entry.getKey();
			List<CodeableConcept> v = entry.getValue();
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
}
