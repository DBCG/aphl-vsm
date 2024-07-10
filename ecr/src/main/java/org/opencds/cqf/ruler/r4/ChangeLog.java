package org.opencds.cqf.ruler.r4;

import ca.uhn.fhir.rest.server.exceptions.UnprocessableEntityException;
import org.opencds.cqf.ruler.TransformProperties;
import org.apache.commons.lang3.StringUtils;
import org.hl7.fhir.instance.model.api.IBase;
import org.hl7.fhir.instance.model.api.IPrimitiveType;
import org.hl7.fhir.r4.model.*;
import org.hl7.fhir.r4.model.Enumerations.PublicationStatus;
import org.opencds.cqf.fhir.utility.Canonicals;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class ChangeLog {
  public List<Page<?>> pages;
  public String manifestUrl;
  ChangeLog(String url) {
    this.pages = new ArrayList<Page<?>>();
    this.manifestUrl = url;
  }
  public <T extends PageBase> Page<T> addPage(String url, T oldData, T newData) {
    var page = new Page<T>(url, oldData, newData);
    this.pages.add(page);
    return page;
  }
  public Page<ValueSetChild> addPage(ValueSet theSourceResource, ValueSet theTargetResource, KnowledgeArtifactProcessor.diffCache cache) throws UnprocessableEntityException {
    if (!theSourceResource.getUrl().equals(theTargetResource.getUrl())) {
      throw new UnprocessableEntityException("URLs don't match");
    }
    // Map< [Code], [Object with code, version, system, etc.] > 
    Map<String, ValueSetChild.Code> codeMap = new HashMap<String, ValueSetChild.Code>();
    // Map< [URL], Map <[Version], [Object with name, version, and other metadata] >> 
    Map<String, Map<String,ValueSetChild.Leaf>> leafMetadataMap = new HashMap<String, Map<String,ValueSetChild.Leaf>>();
    
    updateCodeMapAndLeafMetadataMap(codeMap, leafMetadataMap, theSourceResource, cache);
    updateCodeMapAndLeafMetadataMap(codeMap, leafMetadataMap, theTargetResource, cache);
    var oldData = new ValueSetChild(theSourceResource.getTitle(), theSourceResource.getIdPart(), theSourceResource.getVersion(), theSourceResource.getName(), theSourceResource.getUrl(), theSourceResource.getCompose().getInclude(), theSourceResource.getExpansion().getContains(), codeMap, leafMetadataMap);
    var newData = new ValueSetChild(theTargetResource.getTitle(), theTargetResource.getIdPart(), theTargetResource.getVersion(), theTargetResource.getName(), theTargetResource.getUrl(), theTargetResource.getCompose().getInclude(), theTargetResource.getExpansion().getContains(), codeMap, leafMetadataMap);
    var url = theTargetResource.getUrl();
    var page = new Page<ValueSetChild>(url, oldData, newData);
    this.pages.add(page);
    return page;
  }
  private void updateCodeMapAndLeafMetadataMap(Map<String, ValueSetChild.Code> codeMap, Map<String, Map<String,ValueSetChild.Leaf>> leafMap, ValueSet valueSet, KnowledgeArtifactProcessor.diffCache cache) {
    var leafCodeSystems = updateLeafMap(leafMap, valueSet).codeSystems;
    if (valueSet.getCompose().hasInclude()) {
      valueSet.getCompose().getInclude()
        .forEach(concept -> {
          if (concept.hasConcept()) {
            var codeSystemName = ValueSetChild.Code.getCodeSystemName(concept.getSystem());
            var codeSystemOid = ValueSetChild.Code.getCodeSystemOid(concept.getSystem());
            leafCodeSystems.add(new ValueSetChild.Leaf.NameAndOid(codeSystemName, codeSystemOid));
            mapConceptSetToCodeMap(codeMap, concept, Canonicals.getIdPart(valueSet.getUrl()), valueSet.getName(), valueSet.getUrl());
          }
          if (concept.hasValueSet()) {
            concept.getValueSet().stream()
            .map(vs -> cache.getResource(vs.getValue()).map(v -> (ValueSet) v))
            .filter(Optional::isPresent).map(Optional::get)
            .forEach(vs -> {
              updateLeafMap(leafMap, vs);
              updateCodeMapAndLeafMetadataMap(codeMap, leafMap, vs, cache);
            });
          }
        });
    }

  }
  private ValueSetChild.Leaf updateLeafMap(Map<String, Map<String, ValueSetChild.Leaf>> leafMap, ValueSet valueSet) throws UnprocessableEntityException {
    if (!valueSet.hasVersion()) {
      throw new UnprocessableEntityException("ValueSet " + valueSet.getUrl() + " does not have a version");
    }

    var versionedLeafMap = leafMap.get(valueSet.getUrl());;
    if (!leafMap.containsKey(valueSet.getUrl())) {
      versionedLeafMap = new HashMap<String, ValueSetChild.Leaf>();
      leafMap.put(valueSet.getUrl(),versionedLeafMap);
    }

    var leaf = versionedLeafMap.get(valueSet.getVersion());
    if (!versionedLeafMap.containsKey(valueSet.getVersion())) {
      leaf = new ValueSetChild.Leaf(Canonicals.getIdPart(valueSet.getUrl()), valueSet.getName(), valueSet.getUrl(), 
      valueSet.getStatus()
      );
      versionedLeafMap.put(valueSet.getVersion(), leaf);
    }
    return leaf;
  }
  // can this be done with a fhir operation? tx server work?
  private void mapConceptSetToCodeMap(Map<String, ValueSetChild.Code> codeMap, ValueSet.ConceptSetComponent concept, String source, String name, String url){
      var system = concept.getSystem();
      var id = concept.getId();
      var version = concept.getVersion();
      concept.getConcept()
        .stream()
        .filter(ValueSet.ConceptReferenceComponent::hasCode)
        .forEach(conceptReference -> {
          var code = new ValueSetChild.Code(id, system, conceptReference.getCode(), version, conceptReference.getDisplay(), source, name, url, null);
          codeMap.put(conceptReference.getCode(), code);
        });
  }
  public Page<LibraryChild> addPage(Library theSourceResource, Library theTargetResource) throws UnprocessableEntityException {
    if (!theSourceResource.getUrl().equals(theTargetResource.getUrl())) {
      throw new UnprocessableEntityException("URLs don't match");
    }
    var oldData = new LibraryChild(theSourceResource.getName(), theSourceResource.getPurpose(), theSourceResource.getTitle(), theSourceResource.getIdPart(), theSourceResource.getVersion(), theSourceResource.getUrl(), Optional.ofNullable((Period)theSourceResource.getEffectivePeriod()).map(p -> p.getStart()).map(s-> s.toString()).orElse(null), Optional.ofNullable(theSourceResource.getApprovalDate()).map(s-> s.toString()).orElse(null), theSourceResource.getRelatedArtifact());
    var newData = new LibraryChild(theTargetResource.getName(), theTargetResource.getPurpose(), theTargetResource.getTitle(), theTargetResource.getIdPart(), theTargetResource.getVersion(), theTargetResource.getUrl(), Optional.ofNullable((Period)theTargetResource.getEffectivePeriod()).map(p -> p.getStart()).map(s-> s.toString()).orElse(null), Optional.ofNullable(theTargetResource.getApprovalDate()).map(s-> s.toString()).orElse(null), theTargetResource.getRelatedArtifact());    
    var url = theTargetResource.getUrl();
    var page = new Page<LibraryChild>(url, oldData, newData);
    this.pages.add(page);
    return page;
  }
  public Page<PlanDefinitionChild> addPage(PlanDefinition theSourceResource, PlanDefinition theTargetResource) throws UnprocessableEntityException {
    if (!theSourceResource.getUrl().equals(theTargetResource.getUrl())) {
      throw new UnprocessableEntityException("URLs don't match");
    }
    var oldData = new PlanDefinitionChild(theSourceResource.getTitle(), theSourceResource.getIdPart(), theSourceResource.getVersion(), theSourceResource.getName(), theSourceResource.getUrl());
    var newData = new PlanDefinitionChild(theTargetResource.getTitle(), theTargetResource.getIdPart(), theTargetResource.getVersion(), theTargetResource.getName(), theTargetResource.getUrl());
    var url = theTargetResource.getUrl();
    var page = new Page<PlanDefinitionChild>(url, oldData, newData);
    this.pages.add(page);
    return page;
  }
  public boolean hasPage(String url) {
    return this.pages.stream().filter(p -> p.url.equals(url)).findAny().isPresent();
  }
  public Optional<Page<? extends PageBase>> getPage(String url) {
    return this.pages.stream().filter(p -> p.url.equals(url)).findAny();
  }
  public void handleRelatedArtifacts() {
    var manifest = this.getPage(this.manifestUrl);
    if (manifest.isPresent()) {
      var specLibrary = manifest.get();
      var manifestOldData = (LibraryChild)specLibrary.oldData;
      var manifestNewData = (LibraryChild)specLibrary.newData;
      if (manifestNewData != null) {
        for (final var page: this.pages) {
          if (page.oldData instanceof ValueSetChild) {
            for (final var ra: manifestOldData.relatedArtifacts) {
              ((ValueSetChild)page.oldData).leafValuesets.stream()
                .filter(leafValueSet -> leafValueSet.memberOid != null && leafValueSet.memberOid.equals(Canonicals.getIdPart(ra.value)))
                .forEach(leafValueSet -> {
                  updateConditions(ra, leafValueSet);
                  updatePriorities(ra, leafValueSet);
                });
            }
          }
          if (page.newData instanceof ValueSetChild) {
            for (final var ra: manifestNewData.relatedArtifacts) {
              ((ValueSetChild)page.newData).leafValuesets.stream()
                .filter(leafValueSet -> leafValueSet.memberOid != null && leafValueSet.memberOid.equals(Canonicals.getIdPart(ra.value)))
                .forEach(leafValueSet -> {
                  updateConditions(ra, leafValueSet);
                  updatePriorities(ra, leafValueSet);
                });
            }
          }
        }
      }
    }
  }
  private void updateConditions(RelatedArtifactUrlWithOperation ra, ChangeLog.ValueSetChild.Leaf leafValueSet) {
    ra.conditions.forEach(condition -> {
      if (condition.value != null && condition.value.hasValue() && condition.value.getValue() instanceof CodeableConcept) {
        var coding = ((CodeableConcept)condition.value.getValue()).getCodingFirstRep();
        var conditionName = (coding.getDisplay() == null || coding.getDisplay().isBlank()) ? ((CodeableConcept)condition.value.getValue()).getText() : coding.getDisplay();
        leafValueSet.conditions.add(new ValueSetChild.Code(
          coding.getId(), 
          coding.getSystem(), 
          coding.getCode(), 
          coding.getVersion(), 
          conditionName, 
          null, 
          null,
          null,
          condition.operation));
      }
    });
  }
  private void updatePriorities(RelatedArtifactUrlWithOperation ra, ChangeLog.ValueSetChild.Leaf leafValueSet) {
    if (ra.priority.value != null && ra.priority.value.hasValue()) {
      var coding = ((CodeableConcept)ra.priority.value.getValue()).getCodingFirstRep();
      leafValueSet.priority.value = coding.getCode();
      leafValueSet.priority.operation = ra.priority.operation;
    }
  }
  public static class Page<T extends PageBase> {
      public T oldData;
      public T newData;
      public String url;
      Page(String url, T oldData, T newData) {
        this.url = url;
        this.oldData = oldData;
        this.newData = newData;
      }
      void addOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
        if (type != null) {
          switch (type) {
            case "replace":
              addReplaceOperation(type, path, currentValue, originalValue, parent);
              break;
            case "delete":
              addDeleteOperation(type, path, null, originalValue, parent);
              break;
            case "insert":
              addInsertOperation(type, path, currentValue, null, parent);
              break;
            default:
              throw new UnprocessableEntityException("Unknown type provided when adding an operation to the ChangeLog");
          }
        } else {
          throw new UnprocessableEntityException("Type must be provided when adding an operation to the ChangeLog");
        }
      }
      void addInsertOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
        if (type != "insert") {
          throw new UnprocessableEntityException("wrong type");
        }
        this.newData.addOperation(type, path, currentValue, originalValue, parent);
      }
      void addDeleteOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
        if (type != "delete") {
          throw new UnprocessableEntityException("wrong type");
        }
        this.oldData.addOperation(type, path, currentValue, originalValue, parent);
      }
      void addReplaceOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
        if (type != "replace") {
          throw new UnprocessableEntityException("wrong type");
        }
        this.oldData.addOperation(type, path, currentValue, null, parent);
        this.newData.addOperation(type, path, null, originalValue, parent);
      }
  }
  public static class ValueAndOperation {
    public String value;
    public Operation operation;
    public void setOperation(Operation operation) {
      if ( operation != null ) {
        if (this.operation != null
        && this.operation.type == operation.type
        && this.operation.path == operation.path
        && this.operation.newValue != operation.newValue) {
          throw new UnprocessableEntityException("Multiple changes to the same element");
        }
        this.operation = operation;
      }
    }
  }
  public static class Operation {
    public String type;
    public String path;
    public Object newValue;
    public Object oldValue;
    Operation(String type, String path, IBase newValue, IBase original) {
      this.type = type;
      this.path = path;
      this.oldValue = original;
      this.newValue = newValue;
    }
    Operation(String type, String path, Object newValue, Object originalValue) {
      this.type = type;
      this.path = path;
      if (originalValue instanceof IPrimitiveType) {
        this.oldValue = ((IPrimitiveType)originalValue).getValue();
      } else if (originalValue instanceof IBase) {
        this.oldValue = originalValue;
      } else if (originalValue != null) {
        this.oldValue = originalValue.toString();
      }
      if (newValue instanceof IPrimitiveType) {
        this.newValue = ((IPrimitiveType)newValue).getValue();
      } else if (newValue instanceof IBase) {
        this.newValue = newValue;
      } else if (newValue != null) {
        this.newValue = newValue.toString();
      }
    }
    
  }
  public static class PageBase {
    public ValueAndOperation title  = new ValueAndOperation();
    public ValueAndOperation id = new ValueAndOperation();
    public ValueAndOperation version = new ValueAndOperation();
    public ValueAndOperation name = new ValueAndOperation();
    public ValueAndOperation url = new ValueAndOperation();
    public String resourceType;
    PageBase(String title, String id, String version, String name, String url) {
      if (!StringUtils.isEmpty(title)) {
        this.title.value = title;
      }
      if (!StringUtils.isEmpty(id)) {
        this.id.value = id;
      }
      if (!StringUtils.isEmpty(version)) {
        this.version.value = version;
      }
      if (!StringUtils.isEmpty(name)) {
        this.name.value = name;
      }
      if (!StringUtils.isEmpty(url)) {
        this.url.value = url;
      }
    }
    public void addOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
      if (type != null) {
        var newOp = new Operation(type, path, currentValue, originalValue);
        if (path.equals("id")) {
          this.id.setOperation(newOp);
        } else if (path.contains("title")) {
          this.title.setOperation(newOp);
        } else if (path.equals("version")) {
          this.version.setOperation(newOp);
        } else if (path.equals("name")) {
          this.name.setOperation(newOp);
        } else if (path.equals("url")) {
          this.url.setOperation(newOp);
        }
      }
    }
  }
  public static class ValueSetChild extends PageBase {
    public List<Code> codes = new ArrayList<>();
    public List<Leaf> leafValuesets = new ArrayList<>();
    public final String resourceType = "ValueSet";
    public List<Operation> operations = new ArrayList<>();
    public static class Code {
      public String id;
      public String system;
      public String code;
      public String version;
      public String display;
      public String memberOid;
      public String codeSystemOid;
      public String codeSystemName;
      public String parentValueSetName;
      public String parentValueSetUrl;
      public Operation operation;
      Code(String id, String system, String code, String version, String display, String memberOid, String parentValueSetName, String parentValueSetUrl, Operation operation) {
        this.id = id;
        this.system = system;
        if (system != null) {
          this.codeSystemOid = getCodeSystemOid(system);
          this.codeSystemName = getCodeSystemName(system);
        }
        this.code = code;
        this.version = version;
        this.display = display;
        this.memberOid = memberOid;
        this.operation = operation;
        this.parentValueSetName = parentValueSetName;
        this.parentValueSetUrl = parentValueSetUrl;
      }
      public Code copy() {
        return new Code(this.id, this.system, this.code, this.version, this.display, this.memberOid, this.parentValueSetName, this.parentValueSetUrl, this.operation);
      }
      public static String getCodeSystemOid(String systemUrl) {
        if (systemUrl.contains("snomed")) {
          return "2.16.840.1.113883.6.96";
        } else if (systemUrl.contains("icd-10")) {
          return "2.16.840.1.113883.6.90";
        } else if (systemUrl.contains("icd-9")) {
          return "2.16.840.1.113883.6.103, 2.16.840.1.113883.6.104";
        } else if (systemUrl.contains("loinc")) {
          return "2.16.840.1.113883.6.1";
        } else {
          return null;
        }
      }
      public static String getCodeSystemName(String systemUrl) {
        if (systemUrl.contains("snomed")) {
          return "SNOMEDCT";
        } else if (systemUrl.contains("icd-10")) {
          return "ICD10CM";
        } else if (systemUrl.contains("icd-9")) {
          return "ICD9CM";
        } else if (systemUrl.contains("loinc")) {
          return "LOINC";
        } else {
          return null;
        }
      }
      public Operation getOperation() {
        return this.operation;
      }
      public void setOperation(Operation operation) {
        if (operation != null) {
          if (this.operation != null
          && this.operation.type == operation.type
          && this.operation.path == operation.path
          && this.operation.newValue != operation.newValue) {
            throw new UnprocessableEntityException("Multiple changes to the same element");
          }
          this.operation = operation;
        }
      }
    }
    public static class Leaf {
      public String memberOid;
      public String name;
      public String url;
      public List<NameAndOid> codeSystems = new ArrayList<NameAndOid>();;
      public String status;
      public List<Code> conditions = new ArrayList<Code>();
      public ValueAndOperation priority = new ValueAndOperation();
      public Operation operation;
      public static class NameAndOid {
        public String name;
        public String oid;
        NameAndOid(String name, String oid) {
          this.name = name;
          this.oid = oid;
        }
        public NameAndOid copy() {
          return new NameAndOid(this.name, this.oid);
        }
      }
      Leaf(String memberOid, String name, String url, PublicationStatus status) {
        this.memberOid = memberOid;
        this.name = name;
        this.url = url;
        if (status != null) {
          this.status = status.getDisplay();
        }
      }
      public Leaf copy() {
        var copy = new Leaf(this.memberOid, this.name, this.url, null);
        copy.status = this.status;
        copy.codeSystems = this.codeSystems.stream().map(c -> c.copy()).collect(Collectors.toList());
        copy.conditions = this.conditions.stream().map(c -> c.copy()).collect(Collectors.toList());
        copy.priority = new ValueAndOperation();
        copy.priority.value = this.priority.value;
        copy.priority.operation = this.priority.operation;
        copy.operation = this.operation;
        return copy;
      }
    }
    ValueSetChild(String title, String id, String version, String name, String url, List<ValueSet.ConceptSetComponent> compose, List<ValueSet.ValueSetExpansionContainsComponent> contains, Map< String , Code> codeMap, Map< String, Map< String, Leaf > > leafMetadataMap) {
      super(title, id, version, name, url);
      if (contains != null) {
        contains.forEach(contained -> {
          if (contained.getCode() != null && codeMap.containsKey(contained.getCode())) {
            this.codes.add(codeMap.get(contained.getCode()));
          }
        });
      }
      if (compose != null) {
        compose.stream()
          .filter(cmp -> cmp.hasValueSet())
          .flatMap(c -> c.getValueSet().stream())
          .filter(vs -> vs.hasValue())
          .map(vs -> vs.getValue())
          .forEach(vs -> {
            // sometimes the value set reference is unversioned - implying that the latest version should be used
            // we need to make sure the diff operation only has the latest version in it, thereby we can get away with just having one url in the map and taking it
            var urlPart = Canonicals.getUrl(vs);
            if (Canonicals.getVersion(vs) == null) {
              // assume there is only the latest version
              var latest = leafMetadataMap.get(urlPart).entrySet().iterator().next().getValue();
              // creating a new object because modifying it causes weirdness later
              leafValuesets.add(latest.copy());
            } else {
              var versionPart = Canonicals.getVersion(vs);
              var leaf = leafMetadataMap.get(urlPart).get(versionPart);
              // creating a new object because modifying it causes weirdness later
              leafValuesets.add(leaf.copy());
            }
          });
      }
    }
    @Override
    public void addOperation(String type, String path, Object newValue, Object originalValue, ChangeLog parent) {
      if (type != null) {
        super.addOperation(type, path, newValue, originalValue, parent);
        var operation = new Operation(type,path,newValue,originalValue);
        if (path.contains("compose.include")) {
          // if the valuesets changed
          String urlToCheck = null;
          if (newValue instanceof IPrimitiveType) {
            urlToCheck = ((IPrimitiveType<String>) newValue).getValue();
          } else if (originalValue instanceof IPrimitiveType){
            urlToCheck = ((IPrimitiveType<String>) originalValue).getValue();
          } else if ( newValue instanceof ValueSet.ValueSetComposeComponent){
            urlToCheck = ((ValueSet.ValueSetComposeComponent) newValue).getIncludeFirstRep().getValueSet().get(0).getValue();
          }else if (originalValue instanceof ValueSet.ValueSetComposeComponent){
            urlToCheck = ((ValueSet.ValueSetComposeComponent) originalValue).getIncludeFirstRep().getValueSet().get(0).getValue();
          }
          if (urlToCheck != null) {
            final var urlNotNull = Canonicals.getIdPart(urlToCheck);
            this.leafValuesets.stream().forEach(leafValueSet -> {
              if (leafValueSet.memberOid.equals(urlNotNull)) {
                leafValueSet.operation = operation;
              }
            });
          }
        } else if (path.contains("expansion.contains[")) {
          // if the codes themselves changed
          String codeToCheck = null;
          if (newValue instanceof IPrimitiveType || originalValue instanceof IPrimitiveType) {
            codeToCheck = newValue instanceof IPrimitiveType ? ((IPrimitiveType<String>) newValue).getValue() : ((IPrimitiveType<String>) originalValue).getValue();
          } else if (originalValue instanceof ValueSet.ValueSetExpansionContainsComponent){
            codeToCheck = ((ValueSet.ValueSetExpansionContainsComponent) originalValue).getCode();
          }
          if (codeToCheck != null) {
            final String codeNotNull = codeToCheck;
            this.codes.stream()
              .filter(code -> code.code != null)
              .filter(code -> code.code.equals(codeNotNull)).findAny()
              .ifPresentOrElse(code -> {
                code.setOperation(operation);
              },
              () -> {
                // drop unmatched operations in the base operations list
                this.operations.add(operation);
              }); 
          }
        } else {
          this.operations.add(operation);
        }
      }
    }
  }
  public static class PlanDefinitionChild extends PageBase {
    public final String resourceType = "PlanDefinition";
    PlanDefinitionChild(String title, String id, String version, String name, String url) {
      super(title, id, version, name, url);
    }
  }
  public static class RelatedArtifactUrlWithOperation extends ValueAndOperation {
    public RelatedArtifact fullRelatedArtifact;
    public List<extensionWithOperation> conditions = new ArrayList<>();
    public extensionWithOperation priority = new extensionWithOperation(null);
    public static class extensionWithOperation {
      public Extension value;
      public Operation operation;
      extensionWithOperation(Extension e) {
        this.value = e;
      }
    }
    RelatedArtifactUrlWithOperation(RelatedArtifact relatedArtifact) {
      if (relatedArtifact != null) {
        this.value = relatedArtifact.getResource();
        this.conditions = relatedArtifact.getExtensionsByUrl(TransformProperties.vsmCondition).stream()
          .map(e -> new extensionWithOperation(e)).collect(Collectors.toList());
        var priorities = relatedArtifact.getExtensionsByUrl(TransformProperties.vsmPriority);
        if (priorities.size() > 1) {
          throw new UnprocessableEntityException("too many priorities");
        } else if (priorities.size() == 1) {
          this.priority.value = priorities.get(0);
        }
      }
      this.fullRelatedArtifact = relatedArtifact;
    }
  }
  public static class LibraryChild extends PageBase {
    public final String resourceType = "Library";
    public ValueAndOperation purpose = new ValueAndOperation();
    public ValueAndOperation effectiveStart = new ValueAndOperation();
    public ValueAndOperation releaseDate = new ValueAndOperation();
    public List<RelatedArtifactUrlWithOperation> relatedArtifacts = new ArrayList<>();
    LibraryChild(String name, String purpose, String title, String id, String version, String url, String effectiveStart, String releaseDate, List<RelatedArtifact> relatedArtifacts) {
      super(title, id, version, name, url);
      if (!StringUtils.isEmpty(purpose)) {
        this.purpose.value = purpose;
      }
      if (!StringUtils.isEmpty(effectiveStart)) {
        this.effectiveStart.value = effectiveStart;
      }
      if (!StringUtils.isEmpty(releaseDate)) {
        this.releaseDate.value = releaseDate;
      }
      if (!relatedArtifacts.isEmpty()) {
        relatedArtifacts.forEach(ra -> this.relatedArtifacts.add(new RelatedArtifactUrlWithOperation(ra)));
      }
    }
    private Optional<RelatedArtifactUrlWithOperation> getRelatedArtifactFromUrl(String target) {
      return this.relatedArtifacts.stream().filter(ra -> ra.value != null && ra.value.equals(target)).findAny();
    }
    private void tryAddConditionOperation(Extension maybeCondition, RelatedArtifactUrlWithOperation target, Operation newOperation) {
      if (maybeCondition.getUrl().equals(TransformProperties.vsmCondition)) {
        target.conditions.stream()
          .filter(e -> e.value.getUrl().equals(TransformProperties.vsmCondition)
               && e.value.getValue() instanceof CodeableConcept
               && ((CodeableConcept)e.value.getValue()).getCodingFirstRep().getSystem().equals(((CodeableConcept)maybeCondition.getValue()).getCodingFirstRep().getSystem())
               && ((CodeableConcept)e.value.getValue()).getCodingFirstRep().getCode().equals(((CodeableConcept)maybeCondition.getValue()).getCodingFirstRep().getCode())
          )
          .findAny()
          .ifPresent(condition -> {
            condition.operation = newOperation;
          });
      }
    }
    private void tryAddPriorityOperation(Extension maybePriority, RelatedArtifactUrlWithOperation target, Operation newOperation) {
      if (maybePriority.getUrl().equals(TransformProperties.vsmPriority)) {
        if (target.priority.value != null
          && target.priority.value.getUrl().equals(TransformProperties.vsmPriority)
          && target.priority.value.getValue() instanceof CodeableConcept
          && ((CodeableConcept)target.priority.value.getValue()).getCodingFirstRep().getSystem().equals(((CodeableConcept)maybePriority.getValue()).getCodingFirstRep().getSystem())
          && ((CodeableConcept)target.priority.value.getValue()).getCodingFirstRep().getCode().equals(((CodeableConcept)maybePriority.getValue()).getCodingFirstRep().getCode())
          ) {
            target.priority.operation = newOperation;
          };
      }
    }
    @Override
    public void addOperation(String type, String path, Object currentValue, Object originalValue, ChangeLog parent) {
      if(type != null) {
        super.addOperation(type, path, currentValue, originalValue, parent);
        var newOperation = new Operation(type, path, currentValue, originalValue);
        Optional<RelatedArtifactUrlWithOperation> operationTarget = Optional.ofNullable(null);
        if (path != null && path.contains("elatedArtifact") ){
          if (currentValue instanceof RelatedArtifact) {
            operationTarget = getRelatedArtifactFromUrl(((RelatedArtifact) currentValue).getResource());
          } else if (originalValue instanceof RelatedArtifact) {
            operationTarget = getRelatedArtifactFromUrl(((RelatedArtifact) originalValue).getResource());
          } else if (path.contains("[")) {
            var matcher = Pattern
										.compile("relatedArtifact\\[(\\d+)\\]")
										.matcher(path);
            if (matcher.find()) {
              var relatedArtifactIndex = Integer.parseInt(matcher.group(1));
              operationTarget = Optional.of(this.relatedArtifacts.get(relatedArtifactIndex));
            }
          }
          if (operationTarget.isPresent()) {
            if (path.contains("xtension[")) {
              var matcher = Pattern
										.compile("xtension\\[(\\d+)\\]")
										.matcher(path);
              if (matcher.find()) {
                var extension = operationTarget.get().fullRelatedArtifact.getExtension().get(Integer.parseInt(matcher.group(1)));
                tryAddConditionOperation(extension, operationTarget.orElse(null), newOperation);
                tryAddPriorityOperation(extension, operationTarget.orElse(null), newOperation);
              }
            } else if (currentValue instanceof Extension){
              tryAddConditionOperation((Extension)currentValue, operationTarget.orElse(null), newOperation);
              tryAddPriorityOperation((Extension)currentValue, operationTarget.orElse(null), newOperation);
            } else if (originalValue instanceof Extension){
              tryAddConditionOperation((Extension)originalValue, operationTarget.orElse(null), newOperation);
              tryAddPriorityOperation((Extension)originalValue, operationTarget.orElse(null), newOperation);
            } else {
              operationTarget.get().operation = newOperation;
            }
          }
        } else if (path.equals("name")) {
          this.name.setOperation(newOperation);
        } else if (path.contains("purpose")) {
          this.purpose.setOperation(newOperation);
        } else if (path.equals("approvalDate")) {
          this.releaseDate.setOperation(newOperation);
        } else if (path.contains("effectivePeriod")) {
          this.effectiveStart.setOperation(newOperation);
        }
      }
    }
  }
}