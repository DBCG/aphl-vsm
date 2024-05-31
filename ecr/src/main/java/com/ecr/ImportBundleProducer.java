package com.ecr;

import ca.uhn.fhir.jpa.searchparam.SearchParameterMap;
import ca.uhn.fhir.rest.param.TokenParam;
import ca.uhn.fhir.rest.param.UriParam;
import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;

import org.hl7.fhir.r4.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
			&& resource.getUseContext().stream()
				.anyMatch(uc -> uc.hasCode() && uc.getCode().getCode().equals(TransformProperties.grouperType));
	}

	public static boolean isRootSpecificationLibrary(Resource resource) {
		return resource.hasMeta() && resource.getMeta().hasProfile(TransformProperties.usPHSpecLibProfile);
	}

	public static boolean isModelGrouperUseContextMissing(ValueSet vs) {
		return vs.getUseContext().stream()
				.noneMatch(uc ->
						uc.getValue() instanceof CodeableConcept &&
						uc.getValueCodeableConcept().getCodingFirstRep().getCode().equals(TransformProperties.modelGrouper) &&
								uc.getCode().getCode().equals(TransformProperties.grouperType)
				);
	}

	private static void addModelGrouperUseContextIfMissing(ValueSet vs) {
		if(isModelGrouperUseContextMissing(vs)){
			var usageContext = new UsageContext();

			var code = new Coding();
			code.setSystem(TransformProperties.grouperUsageContextCodeURL);
			code.setCode(TransformProperties.grouperType);

			Coding valueCodeableConceptCoding = new Coding();
			valueCodeableConceptCoding.setCode(TransformProperties.modelGrouper);
			valueCodeableConceptCoding.setSystem(TransformProperties.grouperUsageContextCodableConceptSystemURL);

			usageContext.setCode(code);
			usageContext.getValueCodeableConcept().setText("Model grouper");
			usageContext.getValueCodeableConcept().getCoding().add(valueCodeableConceptCoding);

			vs.addUseContext(usageContext);
		}
	}

	public static List<Bundle.BundleEntryComponent> transformImportBundle(Bundle parameterBundle, TransformProperties transformProperties) throws FhirResourceExists {
		// store for processing root library
		Map<String, List<CodeableConcept>> conditionsMap = new HashMap<>();
		Map<String, List<CodeableConcept>> priorityMap = new HashMap<>();
		List<String> groupers = new ArrayList<>();

		PlanDefinition planDefinition = null;
		Library rootLibrary = null;
		Library rctcLibrary = null;

		List<Bundle.BundleEntryComponent> bundleEntries = new ArrayList<>();
		var entries = parameterBundle.getEntry();
		for (final var entry : entries) {
			if (entry.getResource() instanceof MetadataResource) {
				var resource = (MetadataResource) entry.getResource();

				switch (resource.getResourceType()) {
					case ValueSet:
						var valueSet = (ValueSet) resource;
						var valueSetCanonicalUrl = valueSet.getVersion() == null ? valueSet.getUrl() : valueSet.getUrl() + "|" + valueSet.getVersion();
						if (isGrouper(valueSet)) {
							addModelGrouperUseContextIfMissing(valueSet);
							var grouperProfiles = addMetaProfileUrl(valueSet.getMeta(), Collections.singletonList(TransformProperties.valueSetGrouperProfile));
							valueSet.getMeta().setProfile(grouperProfiles);
							groupers.add(valueSetCanonicalUrl);
						} else {
							// Leaf ValueSets
							var leafVsProfiles = addMetaProfileUrl(
								resource.getMeta(),
								Arrays.asList(TransformProperties.leafValueSetVsmHostedProfile, TransformProperties.leafValueSetConditionProfile)
							);
							var filtered = removeProfileFromList(leafVsProfiles, TransformProperties.ersdVSProfile);
							valueSet.getMeta().setProfile(filtered);

							extractPrioritiesAndConditions(valueSet.getUseContext(), priorityMap, conditionsMap, valueSetCanonicalUrl);

							if (valueSet.getExtensionByUrl(TransformProperties.authoritativeSourceExtUrl) == null) {
								var ext = new Extension();
								ext.setUrl(TransformProperties.authoritativeSourceExtUrl);
								ext.setValue(new UriType(TransformProperties.vsacUrl));
								valueSet.getExtension().add(ext);
							}
						}

						// Remove conditions and priority from useContext of leaf valuesets and groupers
						var cleanedContext = valueSet
							.getUseContext()
							.stream()
							.filter(ctx -> ctx.hasCode() && !(ctx.getCode().getCode().equals("focus") || ctx.getCode().getCode().equals("priority")))
							.collect(Collectors.toList());
						valueSet.setUseContext(cleanedContext);

						// Check if ValueSet already exists
						if (!doesResourceExist(valueSet.getUrl(), valueSet.getVersion(), ValueSet.class, transformProperties)) {
							// Save the resource into entry bundle
							bundleEntries.add(getPutResourceRequest(valueSet, "/ValueSet", valueSet.getIdPart()));
						}
						break;
					case Library:
						var library = (Library) resource;
						if (doesResourceExist(library.getUrl(), library.getVersion(), Library.class, transformProperties)) {
							throw new FhirResourceExists("Library", library.getUrl(), library.getVersion());
						} else {
							if (isRootSpecificationLibrary(resource)) {
								rootLibrary = library;
							} else {
								library.getMeta().setProfile(removeProfileFromList(library.getMeta().getProfile(), TransformProperties.ersdVSLibProfile));
								rctcLibrary = library;
							}
						}
						break;
					case PlanDefinition:
						planDefinition = (PlanDefinition) resource;
						break;
					default:
						myLogger.info("resourceType:  " + resource.getResourceType() + " is not supported by $import operation");
						break;
				}
			}
		}

		assert rctcLibrary != null;
		assert planDefinition != null;
		assert rootLibrary != null;

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
	private static List<CanonicalType> removeProfileFromList(List<CanonicalType> profiles, String profileToRemove) {
		if (profiles == null) {
			return new ArrayList<CanonicalType>();
		}
		return profiles.stream().filter(profile -> profile.hasValue() && !profile.getValue().equals(profileToRemove)).collect(Collectors.toList());
	}

	private static void extractPrioritiesAndConditions(List<UsageContext> contexts, Map<String, List<CodeableConcept>> priorityMap, Map<String, List<CodeableConcept>> conditionsMap, String valueSetCanonicalUrl) {
		contexts.forEach(context -> {
			if (context.hasCode()) {
				var code = context.getCode().getCode();
				if (code.equals("focus")) {
					if (conditionsMap.containsKey(valueSetCanonicalUrl)) {
						var conditions = conditionsMap.get(valueSetCanonicalUrl);
						conditions.add(context.getValueCodeableConcept());
					} else {
						conditionsMap.put(valueSetCanonicalUrl, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
					}
				} else if (code.equals("priority")) {
					if (priorityMap.containsKey(valueSetCanonicalUrl)) {
						var priorities = priorityMap.get(valueSetCanonicalUrl);
						if (priorities.size() == 0) {
							priorities.add(context.getValueCodeableConcept());
						} else {
							priorities.forEach(p -> {
								if (p.getCodingFirstRep().hasCode() && !p.getCodingFirstRep().getCode().equals(context.getValueCodeableConcept().getCodingFirstRep().getCode())) {
									throw new UnprocessableEntityException("ValueSet with URL " + valueSetCanonicalUrl + " has conflicting priority codes");
								}
							});
						}
					} else {
						priorityMap.put(valueSetCanonicalUrl, new ArrayList<>(Collections.singletonList(context.getValueCodeableConcept())));
					}
				}
			}
		});
	}

	private static boolean doesResourceExist(String url, String version, Class resource, TransformProperties transformProperties) {
		try {
			var sp = new SearchParameterMap();
			sp.add("url", new UriParam(url));
			sp.add("version", new TokenParam(version));
			var results = transformProperties.search(resource, sp);
			return !results.isEmpty();
		} catch(Exception e) {
			return false;
		}
	}


	private static Bundle.BundleEntryComponent getPutResourceRequest(MetadataResource value, String resourceType, String id) {
		var bundleEntry = new Bundle.BundleEntryComponent();

		var bundleRequest = new Bundle.BundleEntryRequestComponent();
		bundleRequest.setMethod(Bundle.HTTPVerb.PUT);
		bundleRequest.setUrl(resourceType + "?_id=" + id);
		bundleEntry.setRequest(bundleRequest);
		bundleEntry.setResource(value);
		bundleEntry.setFullUrl(value.getUrl());
		return bundleEntry;
	}

	private static List<CanonicalType> addMetaProfileUrl(Meta meta, List<String> urls) {
		List<CanonicalType> profiles = meta.getProfile();

		// Add to profile and ensure not duplicated
		List<CanonicalType> finalProfiles = profiles;
		urls.forEach(url -> finalProfiles.add(new CanonicalType(url)));
		profiles = profiles.stream()
			.filter(distinctByKey(CanonicalType::getValueAsString))
			.collect(Collectors.toList());
		return profiles;
	}

	private static void prepareRootLibrary(
		Map<String, List<CodeableConcept>> conditionsMap,
		Map<String, List<CodeableConcept>> priorityMap,
		PlanDefinition planDefinition,
		Library rctcLibrary,
		List<String> groupers,
		Library rootLibrary
	) {
		// Add to profile and ensure not duplicated
		var rootLibraryProfiles = addMetaProfileUrl(rootLibrary.getMeta(), Collections.singletonList(TransformProperties.crmiManifestLibrary));
		rootLibrary.getMeta().setProfile(rootLibraryProfiles);

		List<RelatedArtifact> relatedArtifacts = new ArrayList<>();

		groupers.forEach(grouper -> {
			var relatedArtifact = new RelatedArtifact();
			relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
			relatedArtifact.setResource(grouper);
			relatedArtifacts.add(relatedArtifact);
		});

		// Set PlanDefinition
		var planDefResourceUrl = planDefinition.getVersion() != null ? planDefinition.getUrl() + "|" + planDefinition.getVersion() : planDefinition.getUrl();
		var relatedArtifactPlanDefComposedOf = new RelatedArtifact();
		relatedArtifactPlanDefComposedOf.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifactPlanDefComposedOf.setResource(planDefResourceUrl);
		var extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifactPlanDefComposedOf.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifactPlanDefComposedOf);

		var relatedArtifactPlanDefDependsOn = new RelatedArtifact();
		relatedArtifactPlanDefDependsOn.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifactPlanDefDependsOn.setResource(planDefResourceUrl);
		relatedArtifacts.add(relatedArtifactPlanDefDependsOn);

		// Set rctc Library
		var rctcUrl = rctcLibrary.getVersion() != null ? rctcLibrary.getUrl() + "|" + rctcLibrary.getVersion() : rctcLibrary.getUrl();
		var relatedArtifactRCTCComposedOf = new RelatedArtifact();
		relatedArtifactRCTCComposedOf.setType(RelatedArtifact.RelatedArtifactType.COMPOSEDOF);
		relatedArtifactRCTCComposedOf.setResource(rctcUrl);
		extension = new Extension();
		extension.setUrl(TransformProperties.crmiIsOwned);

		extension.setValue( new BooleanType(true));
		relatedArtifactRCTCComposedOf.setExtension(new ArrayList<>(Collections.singletonList(extension)));
		relatedArtifacts.add(relatedArtifactRCTCComposedOf);

		var relatedArtifactRCTCDependsOn = new RelatedArtifact();
		relatedArtifactRCTCDependsOn.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
		relatedArtifactRCTCDependsOn.setResource(rctcUrl);
		relatedArtifacts.add(relatedArtifactRCTCDependsOn);

		processCodeableConceptMapForLibrary(conditionsMap, TransformProperties.vsmCondition, relatedArtifacts);
		processCodeableConceptMapForLibrary(priorityMap, TransformProperties.vsmPriority, relatedArtifacts);
		rootLibrary.setRelatedArtifact(relatedArtifacts);
	}

	private static <T> Predicate<T> distinctByKey(Function<? super T, Object> keyExtractor) {
		var seen = new HashSet<>();
		return t -> seen.add(keyExtractor.apply(t));
	}

	private static void processCodeableConceptMapForLibrary(Map<String, List<CodeableConcept>> targetedMap, String extensionUrl, List<RelatedArtifact> relatedArtifacts) {
		for (final var entry : targetedMap.entrySet()) {
			var k = entry.getKey();
			var v = entry.getValue();
			List<Extension> extensions = new ArrayList<>();
			v.forEach(codeableConcept -> {
				var extension = new Extension();
				extension.setUrl(extensionUrl);
				extension.setValue(codeableConcept);
				extensions.add(extension);
			});

			Optional<RelatedArtifact> foundArtifact = relatedArtifacts.stream().filter(i -> i.getResource().equals(k)).findFirst();
			if (foundArtifact.isPresent()) {
				var existingExtensions = foundArtifact.get().getExtension();
				existingExtensions.addAll(extensions);
			} else {
				var relatedArtifact = new RelatedArtifact();
				relatedArtifact.setType(RelatedArtifact.RelatedArtifactType.DEPENDSON);
				relatedArtifact.setResource(k);
				relatedArtifact.setExtension(extensions);

				relatedArtifacts.add(relatedArtifact);
			}
		}
	}
}
