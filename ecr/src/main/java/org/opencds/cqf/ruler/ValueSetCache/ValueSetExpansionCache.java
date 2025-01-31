package org.opencds.cqf.ruler.ValueSetCache;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.CRC32;

import org.hl7.fhir.instance.model.api.IPrimitiveType;
import org.hl7.fhir.r4.model.Parameters;
import org.hl7.fhir.r4.model.ValueSet;
import org.opencds.cqf.fhir.utility.adapter.IAdapterFactory;
import org.opencds.cqf.fhir.utility.adapter.IKnowledgeArtifactAdapter;
import org.opencds.cqf.fhir.utility.adapter.IValueSetAdapter;
import org.opencds.cqf.ruler.ImportBundleProducer;

import ca.uhn.fhir.context.FhirVersionEnum;

public class ValueSetExpansionCache implements org.opencds.cqf.fhir.cr.visitor.IValueSetExpansionCache {
    private final FhirRedisService cacheService;
    private final FhirVersionEnum myVersion;
    public ValueSetExpansionCache(FhirRedisService cache, FhirVersionEnum version) {
        this.cacheService = cache;
        this.myVersion = version;
    } 
    @Override
    public IValueSetAdapter getExpansionForCanonical(String canonical, String expansionParametersHash) {
      var resource = cacheService.getData(createKey(canonical, expansionParametersHash));
      if (resource == null) {
        return null;
      } else {
        return (IValueSetAdapter) IAdapterFactory.forFhirVersion(myVersion).createResource(resource);
      }
    }
    private String createKey(String canonical, String expansionParametersHash) {
      return canonical + "-" + expansionParametersHash;
    }
    @Override
    public boolean addToCache(IValueSetAdapter vset, String expansionParametersHash) {
      // don't cache Groupers
      if (ImportBundleProducer.isGrouper((ValueSet)vset.get())) {
        return true;
      }
      // don't cache without versions
      if (!vset.hasVersion()) {
        return true;
      }
      if (getExpansionForCanonical(vset.getCanonical(), expansionParametersHash) == null) {
        cacheService.saveData(createKey(vset.getCanonical(), expansionParametersHash) , vset.get());
      }
      return true;
    }
    @Override
    public Optional<String> getExpansionParametersHash(IKnowledgeArtifactAdapter adapter) {
      return adapter.getExpansionParameters().map(p -> ((Parameters)p).getParameter().stream()
        .map(p2 -> ((IPrimitiveType<String>)p2.getValue()).getValue())
        .sorted()
        .collect(Collectors.joining(",")))
      .map(s -> hashString(s));
    }
    private static String hashString(String input) {
        CRC32 crc = new CRC32();
        crc.update(input.getBytes(StandardCharsets.UTF_8));
        
        // Convert CRC32 long value to a hexadecimal string
        return Long.toHexString(crc.getValue()).toUpperCase(); // Uppercase for consistent formatting
    }
}
