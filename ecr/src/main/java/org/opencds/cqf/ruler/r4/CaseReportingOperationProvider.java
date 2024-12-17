package org.opencds.cqf.ruler.r4;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.context.FhirVersionEnum;
import ca.uhn.fhir.context.support.DefaultProfileValidationSupport;
import ca.uhn.fhir.cr.common.IRepositoryFactory;
import ca.uhn.fhir.jpa.api.dao.DaoRegistry;
import ca.uhn.fhir.jpa.api.dao.IFhirResourceDaoValueSet;
import ca.uhn.fhir.jpa.validation.ValidatorResourceFetcher;
import ca.uhn.fhir.model.api.annotation.Description;
import ca.uhn.fhir.parser.path.EncodeContextPath;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.Operation;
import ca.uhn.fhir.rest.annotation.OperationParam;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.InternalErrorException;
import ca.uhn.fhir.rest.server.exceptions.NotImplementedOperationException;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.Version;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.apache.commons.beanutils.PropertyUtilsBean;
import org.hl7.fhir.common.hapi.validation.support.CommonCodeSystemsTerminologyService;
import org.hl7.fhir.common.hapi.validation.support.InMemoryTerminologyServerValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.NpmPackageValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.SnapshotGeneratingValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.ValidationSupportChain;
import org.hl7.fhir.common.hapi.validation.validator.FhirInstanceValidator;
import org.hl7.fhir.exceptions.FHIRException;
import org.hl7.fhir.instance.model.api.IBase;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IPrimitiveType;
import org.hl7.fhir.r4.model.*;
import org.opencds.cqf.fhir.cr.visitor.*;
import org.opencds.cqf.fhir.utility.Canonicals;
import org.opencds.cqf.fhir.utility.SearchHelper;
import org.opencds.cqf.fhir.utility.adapter.IKnowledgeArtifactAdapter;
import org.opencds.cqf.fhir.utility.adapter.IAdapterFactory;
import org.opencds.cqf.ruler.IBaseSerializer;
import org.opencds.cqf.ruler.ValueSetCache.FhirRedisService;
import org.opencds.cqf.ruler.ValueSetCache.ValueSetExpansionCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import static org.opencds.cqf.ruler.ImportBundleProducer.isGrouper;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class CaseReportingOperationProvider {
	private static final Logger log = LoggerFactory.getLogger(CaseReportingOperationProvider.class);
	@Autowired
	private IRepositoryFactory repositoryFactory;

	@Autowired
	private DaoRegistry daoRegistry;

	@Autowired
	private FhirContext fhirContext;

	@Autowired
	private FhirRedisService fhirRedisService;

	private IAdapterFactory adapterFactory = IAdapterFactory.forFhirVersion(FhirVersionEnum.R4);

	/**
	 * Applies an approval to an existing artifact, regardless of status.
	 *
	 * @param requestDetails                    the {@link RequestDetails RequestDetails}
	 * @param theId                             the {@link IdType IdType}, always an argument for instance level operations
	 * @param approvalDate                      Optional Date parameter for indicating the date of approval
	 *                                          for an approval submission. If approvalDate is not
	 *                                          provided, the current date will be used.
	 * @param artifactAssessmentType
	 * @param artifactAssessmentSummary
	 * @param artifactAssessmentTarget
	 * @param artifactAssessmentRelatedArtifact
	 * @param artifactAssessmentAuthor          Optional ArtifactAssessment* arguments represent parts of a
	 *                                          comment to beincluded as part of the approval. The
	 *                                          artifactAssessment is a crmi-artifactAssessment as defined here:
	 *                                          http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-artifactAssessment
	 *                                          A Parameters resource with a parameter for each element
	 *                                          of the ArtifactAssessment Extension definition is
	 *                                          used to represent the proper structure.
	 * @return An IBaseResource that is the targeted resource, updated with the approval
	 */
	@Operation(name = "$approve", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$approve", value = "Apply an approval to an existing artifact, regardless of status.")
	public Bundle approveOperation(
		RequestDetails requestDetails,
		@IdParam IdType theId,
		@OperationParam(name = "approvalDate", typeName = "Date") IPrimitiveType<Date> approvalDate,
		@OperationParam(name = "artifactAssessmentType") String artifactAssessmentType,
		@OperationParam(name = "artifactAssessmentSummary") String artifactAssessmentSummary,
		@OperationParam(name = "artifactAssessmentTarget") CanonicalType artifactAssessmentTarget,
		@OperationParam(name = "artifactAssessmentRelatedArtifact") CanonicalType artifactAssessmentRelatedArtifact,
		@OperationParam(name = "artifactAssessmentAuthor") Reference artifactAssessmentAuthor) throws UnprocessableEntityException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		if (artifactAssessmentTarget != null) {
			if (Canonicals.getUrl(artifactAssessmentTarget) != null
				&& !Canonicals.getUrl(artifactAssessmentTarget).equals(resource.getUrl())) {
				throw new UnprocessableEntityException("ArtifactAssessmentTarget URL does not match URL of resource being approved.");
			}
			if (Canonicals.getVersion(artifactAssessmentTarget) != null
				&& !Canonicals.getVersion(artifactAssessmentTarget).equals(resource.getVersion())) {
				throw new UnprocessableEntityException("ArtifactAssessmentTarget version does not match version of resource being approved.");
			}
		} else if (artifactAssessmentTarget == null) {
			String target = "";
			String url = resource.getUrl();
			String version = resource.getVersion();
			if (url != null) {
				target += url;
			}
			if (version != null) {
				if (url != null) {
					target += "|";
				}
				target += version;
			}
			if (target != null) {
				artifactAssessmentTarget = new CanonicalType(target);
			}
		}
		var params = new Parameters();
		if (approvalDate != null && approvalDate.hasValue()) {
			params.addParameter("approvalDate", new DateType(approvalDate.getValue()));
		}
		if (artifactAssessmentType != null) {
			params.addParameter("artifactAssessmentType", artifactAssessmentType);
		}
		if (artifactAssessmentTarget != null) {
			params.addParameter("artifactAssessmentTarget", artifactAssessmentTarget);
		}
		if (artifactAssessmentSummary != null) {
			params.addParameter("artifactAssessmentSummary", artifactAssessmentSummary);
		}
		if (artifactAssessmentRelatedArtifact != null) {
			params.addParameter("artifactAssessmentRelatedArtifact", artifactAssessmentRelatedArtifact);
		}
		if (artifactAssessmentAuthor != null) {
			params.addParameter("artifactAssessmentAuthor", artifactAssessmentAuthor);
		}
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		var visitor = new ApproveVisitor(repository);
		return ((Bundle) adapter.accept(visitor, params));
	}

	/**
	 * Creates a draft of an existing artifact if it has status Active.
	 *
	 * @param requestDetails the {@link RequestDetails RequestDetails}
	 * @param theId          the {@link IdType IdType}, always an argument for instance level operations
	 * @param version        new version in the form MAJOR.MINOR.PATCH
	 * @return A transaction bundle result of the newly created resources
	 */
	@Operation(name = "$draft", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$draft", value = "Create a new draft version of the reference artifact")
	public Bundle draftOperation(RequestDetails requestDetails, @IdParam IdType theId, @OperationParam(name = "version") String version)
		throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters().addParameter("version", new StringType(version));
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		var visitor = new DraftVisitor(repository);
		return ((Bundle) adapter.accept(visitor, params));
	}

	/**
	 * Sets the status of an existing artifact to Active if it has status Draft.
	 *
	 * @param requestDetails     the {@link RequestDetails RequestDetails}
	 * @param theId              the {@link IdType IdType}, always an argument for instance level operations
	 * @param version            new version in the form MAJOR.MINOR.PATCH
	 * @param versionBehavior    how to handle differences between the user-provided and incumbernt versions
	 * @param latestFromTxServer whether or not to query the TxServer if version information is missing from references
	 * @return A transaction bundle result of the updated resources
	 */
	@Operation(name = "$release", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$release", value = "Release an existing draft artifact")
	public Bundle releaseOperation(
		RequestDetails requestDetails,
		@IdParam IdType theId,
		@OperationParam(name = "version") String version,
		@OperationParam(name = "versionBehavior") CodeType versionBehavior,
		@OperationParam(name = "latestFromTxServer", typeName = "Boolean") IPrimitiveType<Boolean> latestFromTxServer,
		@OperationParam(name = "requireNonExperimental") CodeType requireNonExperimental,
		@OperationParam(name = "releaseLabel") String releaseLabel)
		throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters();
		if (version != null) {
			params.addParameter("version", version);
		}
		if (versionBehavior != null) {
			params.addParameter("versionBehavior", versionBehavior);
		}
		if (latestFromTxServer != null && latestFromTxServer.hasValue()) {
			params.addParameter("latestFromTxServer", latestFromTxServer.getValue());
		}
		if (requireNonExperimental != null) {
			params.addParameter("requireNonExperimental", requireNonExperimental);
		}
		if (releaseLabel != null) {
			params.addParameter("releaseLabel", releaseLabel);
		}
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		try {
			var visitor = new ReleaseVisitor(repository);
			adapter.getRelatedArtifact()
				.forEach(ra -> {
					KnowledgeArtifactProcessor.checkIfValueSetNeedsCondition(null, (RelatedArtifact) ra, repository);
				});
			var retval = (Bundle) adapter.accept(visitor, params);
			return retval;
		} catch (Exception e) {
			throw new UnprocessableEntityException(e.getMessage());
		}
	}
  
	// this implmentation is temporary until we integrate the full version from clinical-reasoning
	@Operation(name = "$data-requirements", idempotent = true, global = true)
	@Description(shortDefinition = "$data-requirements", value = "Assembles a Library with a list of all dependencies of an artifact")
	public Library dataRequirementsOperation(
		RequestDetails requestDetails,
		@OperationParam(name = "url") UriType url,
		@OperationParam(name = "identifier") IPrimitiveType<String> identifier,
		@OperationParam(name = "expression") List<String> expression,
		@OperationParam(name = "parameters") Parameters parameters,
		@OperationParam(name = "artifactVersion") List<UriType> artifactVersion,
		@OperationParam(name = "checkArtifactVersion") List<UriType> checkArtifactVersion,
		@OperationParam(name = "forceArtifactVersion") List<UriType> forceArtifactVersion,
		@OperationParam(name = "include") List<String> include,
		@OperationParam(name = "manifest") CanonicalType manifest,
		@OperationParam(name = "artifactEndpointConfiguration") Parameters.ParametersParameterComponent artifactEndpointConfiguration,
		@OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint
	) throws FHIRException {
		var unsupportedParamsList = Arrays.asList(identifier,expression,parameters,artifactVersion,checkArtifactVersion,forceArtifactVersion,include,manifest,artifactEndpointConfiguration,terminologyEndpoint);
		unsupportedParamsList.forEach(param -> {
			if (param != null) {
				throw new NotImplementedOperationException("This operation has not implemented support for any parameters except 'url' at this time");
			}
		});
		if (url == null) {
			throw new UnprocessableEntityException("'url' cannot be null");
		}
		var repository = repositoryFactory.create(requestDetails);
		var hopefullyKnowledgeArtifact = VisitorHelper.tryGetLatestVersion(url.getValue(), repository);
		if (hopefullyKnowledgeArtifact.isEmpty()) {
			throw new ResourceNotFoundException(url.getValue());
		}
		return minimalDataRequirements(hopefullyKnowledgeArtifact.get());
	}
	
	@Operation(name = "$data-requirements", idempotent = true, global = true)
	@Description(shortDefinition = "$data-requirements", value = "Assembles a Library with a list of all dependencies of an artifact")
	public Library dataRequirementsOperation(
		RequestDetails requestDetails,
		@IdParam IdType theId,
		@OperationParam(name = "url") UriType url,
		@OperationParam(name = "identifier") IPrimitiveType<String> identifier,
		@OperationParam(name = "expression") List<String> expression,
		@OperationParam(name = "parameters") Parameters parameters,
		@OperationParam(name = "artifactVersion") List<UriType> artifactVersion,
		@OperationParam(name = "checkArtifactVersion") List<UriType> checkArtifactVersion,
		@OperationParam(name = "forceArtifactVersion") List<UriType> forceArtifactVersion,
		@OperationParam(name = "include") List<String> include,
		@OperationParam(name = "manifest") CanonicalType manifest,
		@OperationParam(name = "artifactEndpointConfiguration") Parameters.ParametersParameterComponent artifactEndpointConfiguration,
		@OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint
	) throws FHIRException {
		var unsupportedParamsList = Arrays.asList(url,identifier,expression,parameters,artifactVersion,checkArtifactVersion,forceArtifactVersion,include,manifest,artifactEndpointConfiguration,terminologyEndpoint);
		unsupportedParamsList.forEach(param -> {
			if (param != null) {
				throw new NotImplementedOperationException("This operation has not implemented support for any parameters at this time");
			}
		});
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(url.getValue());
		}
		return minimalDataRequirements(adapterFactory.createKnowledgeArtifactAdapter(resource));
	}
	private Library minimalDataRequirements(IKnowledgeArtifactAdapter adapter) {
		Library returnLibrary = new Library();
		returnLibrary.setStatus(Enumerations.PublicationStatus.ACTIVE);
		CodeableConcept libraryType = new CodeableConcept();
		Coding typeCoding = new Coding().setCode("module-definition");
		typeCoding.setSystem("http://terminology.hl7.org/CodeSystem/library-type");
		libraryType.addCoding(typeCoding);
		returnLibrary.setName("EffectiveDataRequirements");
		returnLibrary.setType(libraryType);
		returnLibrary.getRelatedArtifact().addAll(adapter.getDependencies().stream().map(dep -> (RelatedArtifact)IKnowledgeArtifactAdapter.newRelatedArtifact(
			FhirVersionEnum.R4,
			"depends-on",
			dep.getReference(),
			null
		)).collect(Collectors.toList()));
		return returnLibrary;
	}
	
	@Operation(name = "$ecr.package", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$ecr.package", value = "Package an artifact and components / dependencies")
	public Bundle packageOperation(
		RequestDetails requestDetails,
		@IdParam IdType theId,
		// TODO: $package - should capability be CodeType?
		@OperationParam(name = "capability") List<String> capability,
		@OperationParam(name = "artifactVersion") List<CanonicalType> artifactVersion,
		@OperationParam(name = "checkArtifactVersion") List<CanonicalType> checkArtifactVersion,
		@OperationParam(name = "forceArtifactVersion") List<CanonicalType> forceArtifactVersion,
		// TODO: $package - should include be CodeType?
		@OperationParam(name = "include") List<String> include,
		@OperationParam(name = "manifest") CanonicalType manifest,
		@OperationParam(name = "offset", typeName = "Integer") IPrimitiveType<Integer> offset,
		@OperationParam(name = "count", typeName = "Integer") IPrimitiveType<Integer> count,
		@OperationParam(name = "packageOnly", typeName = "Boolean") IPrimitiveType<Boolean> packageOnly,
		@OperationParam(name = "artifactEndpointConfiguration") Parameters.ParametersParameterComponent artifactEndpointConfiguration,
		@OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint
	) throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters();
		if (manifest != null) {
			params.addParameter("manifest", manifest);
		}
		if (artifactEndpointConfiguration != null) {
			params.addParameter().setName("artifactEndpointConfiguration").addPart(artifactEndpointConfiguration);
		}
		if (terminologyEndpoint != null) {
			params.addParameter().setName("terminologyEndpoint").setResource(terminologyEndpoint);
		}
		if (offset != null && offset.hasValue()) {
			params.addParameter("offset", new IntegerType(offset.getValue()));
		}
		if (offset != null && offset.hasValue()) {
			params.addParameter("offset", new IntegerType(offset.getValue()));
		}
		if (count != null && count.hasValue()) {
			params.addParameter("count", new IntegerType(count.getValue()));
		}
		if (packageOnly != null && packageOnly.hasValue()) {
			params.addParameter("packageOnly", packageOnly.getValue());
		}
		if (capability != null) {
			capability.forEach(c -> params.addParameter("capability", c));
		}
		if (artifactVersion != null) {
			artifactVersion.forEach(a -> params.addParameter("artifactVersion", a));
		}
		if (checkArtifactVersion != null) {
			checkArtifactVersion.forEach(c -> params.addParameter("checkArtifactVersion", c));
		}
		if (forceArtifactVersion != null) {
			forceArtifactVersion.forEach(f -> params.addParameter("forceArtifactVersion", f));
		}
		if (include != null) {
			include.forEach(i -> params.addParameter("include", i));
		}
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		var expansionCache = new ValueSetExpansionCache(fhirRedisService, FhirVersionEnum.R4);
		var visitor = new PackageVisitor(repository, expansionCache);
		var retval = (Bundle) adapter.accept(visitor, params);
		retval.getEntry().stream()
			.map(e -> (MetadataResource) e.getResource())
			.filter(r -> {
				var id1 = r.getResourceType().toString() + "/" + r.getIdPart();
				var id2 = r.getResourceType().toString() + "/" + theId.getIdPart();
				return id1.equals(id2);
			})
			.findFirst()
			.ifPresent(m -> {
				KnowledgeArtifactProcessor.handleValueSetReferenceExtensions(m, retval.getEntry());
			});
		return retval;
	}

	@Operation(name = "$revise", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$revise", value = "Update an existing artifact in 'draft' status")
	public IBaseResource reviseOperation(RequestDetails requestDetails, @OperationParam(name = "resource") IBaseResource resource)
		throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		return (IBaseResource) KnowledgeArtifactProcessor.revise(repository, (MetadataResource) resource);
	}

	@Operation(name = "$validate", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$validate", value = "Validate a bundle")
	public OperationOutcome validateOperation(RequestDetails requestDetails,
															@OperationParam(name = "resource") IBaseResource resource,
															@OperationParam(name = "mode") CodeType mode,
															@OperationParam(name = "profile") String profile
	)
		throws FHIRException {
		if (mode != null) {
			throw new NotImplementedOperationException("'mode' Parameter not implemented yet.");
		}
		if (profile != null) {
			throw new NotImplementedOperationException("'profile' Parameter not implemented yet.");
		}
		if (resource == null) {
			throw new UnprocessableEntityException("A FHIR resource must be provided for validation");
		}
		if (fhirContext != null) {
			var fhirValidator = fhirContext.newValidator();
			fhirValidator.setValidateAgainstStandardSchema(false);
			fhirValidator.setValidateAgainstStandardSchematron(false);
			var npm = new NpmPackageValidationSupport(fhirContext);
			try {
				npm.loadPackageFromClasspath("classpath:hl7.fhir.us.ecr-2.1.0.tgz");
			} catch (IOException e) {
				throw new InternalErrorException("Could not load package");
			}
			var vsmIG = new NpmPackageValidationSupport(fhirContext);
			try {
				npm.loadPackageFromClasspath("classpath:aphl.fhir.vsm-0.0.1.tgz");
			} catch (IOException e) {
				throw new InternalErrorException("Could not load package");
			}
			var chain = new ValidationSupportChain(
				npm,
				vsmIG,
				new DefaultProfileValidationSupport(fhirContext),
				new InMemoryTerminologyServerValidationSupport(fhirContext),
				new CommonCodeSystemsTerminologyService(fhirContext),
				new SnapshotGeneratingValidationSupport(fhirContext)
			);
			var instanceValidatorModule = new FhirInstanceValidator(chain);
			instanceValidatorModule.setValidatorResourceFetcher(new ValidatorResourceFetcher(fhirContext, chain, daoRegistry));
			fhirValidator.registerValidatorModule(instanceValidatorModule);
			return (OperationOutcome) fhirValidator.validateWithResult(resource, null).toOperationOutcome();
		} else {
			throw new InternalErrorException("Could not load FHIR Context");
		}
	}

	@Operation(name = "$artifact-diff", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$artifact-diff", value = "Diff two knowledge artifacts")
	public Parameters crmiArtifactDiff(RequestDetails requestDetails,
												  @OperationParam(name = "source") String source,
												  @OperationParam(name = "target") String target,
												  @OperationParam(name = "compareExecutable", typeName = "Boolean") IPrimitiveType<Boolean> compareExecutable,
												  @OperationParam(name = "compareComputable", typeName = "Boolean") IPrimitiveType<Boolean> compareComputable,
									   			  @OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint
	) throws UnprocessableEntityException, ResourceNotFoundException {
		var repository = repositoryFactory.create(requestDetails);
		var sourceId = new IdType(source);
		var theSourceResource = SearchHelper.readRepository(repository, sourceId);
		if (theSourceResource == null || !(theSourceResource instanceof MetadataResource)) {
			throw new UnprocessableEntityException("Source resource must exist and be a Knowledge Artifact type.");
		}
		var targetId = new IdType(target);
		var theTargetResource = SearchHelper.readRepository(repository, targetId);
		if (theTargetResource == null || !(theTargetResource instanceof MetadataResource)) {
			throw new UnprocessableEntityException("Target resource must exist and be a Knowledge Artifact type.");
		}
		if (theSourceResource.getClass() != theTargetResource.getClass()) {
			throw new UnprocessableEntityException("Source and target resources must be of the same type.");
		}
		var dao = (IFhirResourceDaoValueSet<ValueSet>) daoRegistry.getResourceDao(ValueSet.class);
		return KnowledgeArtifactProcessor.artifactDiff((MetadataResource) theSourceResource, (MetadataResource) theTargetResource, fhirContext, repository, compareComputable == null ? false : compareComputable.getValue(), compareExecutable == null ? false : compareExecutable.getValue(), dao, null, terminologyEndpoint);
	}

	@Operation(name = "$create-changelog", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$create-changelog", value = "Create a changelog object which can be easily rendered into a table")
	public IBaseResource flattenDiffParametersToChangeLogJSON(RequestDetails requestDetails,
																				 @OperationParam(name = "source") String source,
																				 @OperationParam(name = "target") String target,
																				 @OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint)
	{
		// TODO: check the requestDetails for MIME type and return accordingly
		// 1) Use package to get a pair of bundles
		ExecutorService service = Executors.newCachedThreadPool();
		List<Future<Bundle>> packages;
		Bundle sourceBundle;
		Bundle targetBundle;
		try {
		packages = service.invokeAll(Arrays.asList(
			() -> packageOperation(requestDetails, new IdType(source), null, null, null, null, null, null, null, null, null, null, terminologyEndpoint), 
			() -> packageOperation(requestDetails, new IdType(target), null, null, null, null, null, null, null, null, null, null, terminologyEndpoint)));
			sourceBundle = packages.get(0).get();
			targetBundle = packages.get(1).get();
			service.shutdownNow();
		} catch (InterruptedException | ExecutionException e) {
			service.shutdownNow();
			throw new UnprocessableEntityException(e.getMessage());
		}
		
		// 2) Fill the cache with the bundle contents
		var cache = new KnowledgeArtifactProcessor.diffCache();
		Optional<Library> theSourceResource = Optional.empty();
		Optional<Library> theTargetResource = Optional.empty();
		for (final var entry:sourceBundle.getEntry()) {
			if (entry.hasResource() && entry.getResource() instanceof MetadataResource){
				var resource = (MetadataResource)entry.getResource();
				cache.addSource(resource.getUrl()+"|"+resource.getVersion(), resource);
				if (resource.getIdPart().equals(new IdType(source).getIdPart())) {
					theSourceResource = Optional.of((Library)resource);
				}
			}
		};
		for (final var entry: targetBundle.getEntry()) {
			if (entry.hasResource() && entry.getResource() instanceof MetadataResource){
				var resource = (MetadataResource)entry.getResource();
				cache.addTarget(resource.getUrl()+"|"+resource.getVersion(), resource);
				if (resource.getIdPart().equals(new IdType(target).getIdPart())) {
					theTargetResource = Optional.of((Library)resource);
				}
			}
		};
		// TODO: update this to find the manifest using the profile, not the resourceType
		// 3) Create a diff with that cache and the 2 manifests to compare
		var repository = repositoryFactory.create(requestDetails);
		var dao = (IFhirResourceDaoValueSet<ValueSet>) daoRegistry.getResourceDao(ValueSet.class);
		// 4) Use that diff to create a changelog
		var targetAdapter = IAdapterFactory.forFhirVersion(FhirVersionEnum.R4).createKnowledgeArtifactAdapter(theTargetResource.get());
		var diffParameters = KnowledgeArtifactProcessor.artifactDiff(theSourceResource.get(), theTargetResource.get(), fhirContext, repository, true, true, dao, cache, terminologyEndpoint);
		var manifestUrl = targetAdapter.getUrl();
		var changelog = new ChangeLog(manifestUrl);		// 2) Recursively process the Parameters into a flat ChangeLog
		processChanges(diffParameters.getParameter(), changelog, cache, manifestUrl);

		// 5) Handle the Conditions and Priorities which are in RelatedArtifact changes
		changelog.handleRelatedArtifacts();

		// 6) Generate the output JSON
		var bin = new Binary();
		var mapper = createSerializer();
		try {
			bin.setContent(mapper.writeValueAsString(changelog).getBytes(Charset.forName("UTF-8")));
		} catch (JsonProcessingException e) {
			// TODO: handle exception
			throw new UnprocessableEntityException(e.getMessage());
		}

		return bin;
	}

	/**
	 * Withdraws an existing artifact if it has status Draft.
	 *
	 * @param requestDetails     the {@link RequestDetails RequestDetails}
	 * @param theId              the {@link IdType IdType}, always an argument for instance level operations
	 * @return A transaction bundle result of the withdrawn resources
	 */
	@Operation(name = "$withdraw", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$withdraw", value = "Withdraw an existing draft artifact")
	public Bundle withdrawOperation(
			RequestDetails requestDetails,
			@IdParam IdType theId)
			throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters();
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		try {
			var visitor = new WithdrawVisitor(repository);

			return (Bundle) adapter.accept(visitor, params);
		} catch (Exception e) {
			throw new UnprocessableEntityException(e.getMessage());
		}
	}

	/**
	 * Retires an existing artifact if it has status Draft.
	 *
	 * @param requestDetails     the {@link RequestDetails RequestDetails}
	 * @param theId              the {@link IdType IdType}, always an argument for instance level operations
	 * @return A transaction bundle result of the retire resources
	 */
	@Operation(name = "$retire", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$retire", value = "Retire an existing draft artifact")
	public Bundle retireOperation(
			RequestDetails requestDetails,
			@IdParam IdType theId)
			throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters();
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		try {
			var visitor = new RetireVisitor(repository);

			return (Bundle) adapter.accept(visitor, params);
		} catch (Exception e) {
			throw new UnprocessableEntityException(e.getMessage());
		}
	}

	/**
	 * Deletes an existing artifact if it has status Retired.
	 *
	 * @param requestDetails     the {@link RequestDetails RequestDetails}
	 * @param theId              the {@link IdType IdType}, always an argument for instance level operations
	 * @return A transaction bundle result of the retire resources
	 */
	@Operation(name = "$delete", idempotent = true, global = true, type = MetadataResource.class)
	@Description(shortDefinition = "$delete", value = "Delete a retired artifact")
	public Bundle deleteOperation(
			RequestDetails requestDetails,
			@IdParam IdType theId)
			throws FHIRException {
		var repository = repositoryFactory.create(requestDetails);
		var resource = (MetadataResource) SearchHelper.readRepository(repository, theId);
		if (resource == null) {
			throw new ResourceNotFoundException(theId);
		}
		var params = new Parameters();
		var adapter = adapterFactory.createKnowledgeArtifactAdapter(resource);
		try {
			var visitor = new DeleteVisitor(repository);

			return (Bundle) adapter.accept(visitor, params);
		} catch (Exception e) {
			throw new UnprocessableEntityException(e.getMessage());
		}
	}

	private ObjectMapper createSerializer() {
		var mapper = new ObjectMapper()
			.setSerializationInclusion(JsonInclude.Include.NON_NULL)
			.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
		SimpleModule module = new SimpleModule("IBaseSerializer", new Version(1, 0, 0, null, null, null));
		module.addSerializer(IBase.class, new IBaseSerializer(fhirContext));
		mapper.registerModule(module);
		return mapper;
	}

	private void processChanges(List<Parameters.ParametersParameterComponent> changes, ChangeLog changelog, KnowledgeArtifactProcessor.diffCache cache, String url) {
		// 1) Get the source and target resources so we can pull additional info as necessary
		var resources = cache.getResourcesForUrl(url);
		var resourceType = Canonicals.getResourceType(url);
		// Check if the resource pair was already processed
		var wasPageAlreadyProcessed = changelog.getPage(url).isPresent();
		if (!resources.isEmpty() && !wasPageAlreadyProcessed) {
			final MetadataResource sourceResource = resources.get(0).isSource ? resources.get(0).resource : (resources.size() > 1 ? resources.get(1).resource : null);
			final MetadataResource targetResource = resources.get(0).isSource ? (resources.size() > 1 ? resources.get(1).resource : null) : resources.get(0).resource;
			// don't generate changeLog pages for non-grouper ValueSets
			if (resourceType.equals("ValueSet") 
			&&  ((sourceResource != null && !isGrouper(sourceResource))
				|| (targetResource != null && !isGrouper(targetResource))
				  )) {
				return;
			}
			// 2) Generate a page for each resource pair based on ResourceType
			var page = changelog.getPage(url).orElseGet(() -> {
				switch (resourceType) {
					case "ValueSet":
						return changelog.addPage((ValueSet) sourceResource, (ValueSet) targetResource, cache);
					case "Library":
						return changelog.addPage((Library) sourceResource, (Library) targetResource);
					case "PlanDefinition":
						return changelog.addPage((PlanDefinition) sourceResource, (PlanDefinition) targetResource);
					default:
						return changelog.addPage(sourceResource,targetResource, url);
				}
			});
			for (var change : changes) {
				if (change.hasName() && !change.getName().equals("operation")
					&& change.hasResource() && change.getResource() instanceof Parameters) {
					// Nested Parameters objects get recursively processed
					processChanges(((Parameters) change.getResource()).getParameter(), changelog, cache, change.getName());
				} else if (change.getName().equals("operation")) {
					// 3) For each operation get the relevant parameters
					var type = getStringParameter(change, "type")
						.orElseThrow(() -> new UnprocessableEntityException("Type must be provided when adding an operation to the ChangeLog"));
					var newValue = getParameter(change, "value");
					var path = getPathParameterNoBase(change);
					var originalValue = getParameter(change, "previousValue").map(o -> (Object) o);
					// try to extract the original value from the
					// source object if not present in the Diff
					// Parameters object
					try {
						if (originalValue.isEmpty() && !type.equals("insert")) {
							originalValue = Optional.ofNullable((new PropertyUtilsBean()).getProperty(sourceResource, path.get()));
						}
					} catch (Exception e) {
						// TODO: handle exception
						// var message = e.getMessage();
						throw new InternalErrorException("Could not process path: " + path + ": " + e.getMessage());
					}

					// 4) Add a new operation to the ChangeLog
					page.addOperation(type, path.orElse(null), newValue.orElse(null), originalValue.orElse(null), changelog);
				}
			}
		}
	}

	private Optional<String> getPathParameterNoBase(Parameters.ParametersParameterComponent change) {
		return getStringParameter(change, "path").map(p -> {
			var e = new EncodeContextPath(p);
			var removeBase = removeBase(e);
			return removeBase;
		});
	}

	private String removeBase(EncodeContextPath path) {
		return path.getPath().subList(1, path.getPath().size())
			.stream()
			.map(t -> t.toString())
			.collect(Collectors.joining("."));
	}

	private Optional<String> getStringParameter(Parameters.ParametersParameterComponent part, String name) {
		return part.getPart().stream()
			.filter(p -> p.getName().equalsIgnoreCase(name))
			.filter(p -> p.getValue() instanceof IPrimitiveType)
			.map(p -> (IPrimitiveType) p.getValue())
			.map(s -> (String) s.getValue())
			.findAny();
	}

	private Optional<IBase> getParameter(Parameters.ParametersParameterComponent part, String name) {
		return part.getPart().stream()
			.filter(p -> p.getName().equalsIgnoreCase(name))
			.filter(p -> p.hasValue())
			.map(p -> (IBase) p.getValue())
			.findAny();
	}
}
