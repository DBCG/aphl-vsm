package org.opencds.cqf.ruler;

import java.util.Optional;

import org.hl7.fhir.instance.model.api.IBaseBundle;
import org.opencds.cqf.fhir.utility.adapter.KnowledgeArtifactAdapter;
import org.opencds.cqf.fhir.utility.adapter.ValueSetAdapter;

public interface IValueSetExpansionCache {
  IBaseBundle getExpansionsForCanonical(String canonical);
  Optional<String> getExpansionParametersHash(KnowledgeArtifactAdapter expansionParameters);
  boolean addToCache( ValueSetAdapter expandedValueSet, String expansionParametersHash);
}
