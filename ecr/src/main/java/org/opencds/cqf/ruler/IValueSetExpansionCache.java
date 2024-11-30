package org.opencds.cqf.ruler;

import org.hl7.fhir.instance.model.api.IBaseBundle;
import org.hl7.fhir.instance.model.api.IBaseParameters;
import org.opencds.cqf.fhir.utility.adapter.KnowledgeArtifactAdapter;
import org.opencds.cqf.fhir.utility.adapter.ValueSetAdapter;

public interface IValueSetExpansionCache {
  IBaseBundle getExpansionsForCanonical(String canonical);
  IBaseBundle getExpansionsForAllValueSetsInManifest(KnowledgeArtifactAdapter manifestAdapter);
  String getExpansionParametersHash(IBaseParameters expansionParameters);
  IBaseBundle addExpansionToBundle(String expansionParametersHash, ValueSetAdapter expandedValueSet);
  void updateExpansionsForCanonical(IBaseBundle updatedExpansionsBundle);
}
