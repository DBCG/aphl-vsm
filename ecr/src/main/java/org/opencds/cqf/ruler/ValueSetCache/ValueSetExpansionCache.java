package org.opencds.cqf.ruler.ValueSetCache;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.CRC32;

import org.hl7.fhir.instance.model.api.IBaseBundle;
import org.hl7.fhir.instance.model.api.IDomainResource;
import org.hl7.fhir.instance.model.api.IPrimitiveType;
import org.hl7.fhir.r4.model.Parameters;
import org.opencds.cqf.fhir.utility.BundleHelper;
import org.opencds.cqf.fhir.utility.adapter.KnowledgeArtifactAdapter;
import org.opencds.cqf.fhir.utility.adapter.ValueSetAdapter;
import org.opencds.cqf.ruler.IValueSetExpansionCache;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.context.FhirVersionEnum;

public class ValueSetExpansionCache implements IValueSetExpansionCache {
    private final RedisService cacheService;
    private final FhirVersionEnum myVersion;
    public ValueSetExpansionCache(RedisService cache, FhirContext context) {
        this.cacheService = cache;
        this.myVersion = context.getVersion().getVersion();
    } 
    @Override
    public IBaseBundle getExpansionsForCanonical(String canonical) {
      return (IBaseBundle) cacheService.readFromCache(canonical);
    }
    @Override
    public boolean addToCache(ValueSetAdapter vset, String expansionParametersHash) {
      var cachedExpansions = getExpansionsForCanonical(vset.getCanonical());
      var entry = BundleHelper.newEntryWithResource(myVersion, vset.get());
      if (cachedExpansions == null) {
        var newBundle = BundleHelper.newBundle(myVersion);
        BundleHelper.addEntry(newBundle, entry);
        cacheService.writeToCache(vset.getCanonical(), newBundle, 0, null);
        return true;
      }
      boolean present = BundleHelper.getEntryResources(cachedExpansions).stream().anyMatch(r -> ((IDomainResource)r).getExtension().stream().anyMatch(e -> e.getUrl().equals("expansionParametersHash") && ((IPrimitiveType<String>)e.getValue()).getValue().equals(expansionParametersHash)));
      if (!present) {
        BundleHelper.addEntry(cachedExpansions, entry);
        cacheService.writeToCache(vset.getCanonical(), cachedExpansions, 0, null);
        return true;
      }
      return false;
    }
    @Override
    public Optional<String> getExpansionParametersHash(KnowledgeArtifactAdapter adapter) {
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
