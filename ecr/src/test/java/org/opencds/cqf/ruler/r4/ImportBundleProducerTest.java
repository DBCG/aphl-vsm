package org.opencds.cqf.ruler.r4;

import org.opencds.cqf.ruler.ImportBundleProducer;
import org.opencds.cqf.ruler.TransformProperties;
import org.hl7.fhir.r4.model.Coding;
import org.hl7.fhir.r4.model.TimeType;
import org.hl7.fhir.r4.model.UsageContext;
import org.hl7.fhir.r4.model.ValueSet;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

public class ImportBundleProducerTest {

    @Test
    void testIsGrouper() {
        //Test VS with grouper specific UsageContext
        ValueSet grouper = new ValueSet();
        UsageContext grouperTypeUC = new UsageContext(new Coding(TransformProperties.hl7UsageContextType,TransformProperties.grouperType,TransformProperties.modelGrouper), null);
        grouper.setUseContext(List.of(grouperTypeUC));
        Assertions.assertTrue(ImportBundleProducer.isGrouper(grouper));

        //Test VS with no UsageContext
        ValueSet leaf = new ValueSet();
        Assertions.assertFalse(ImportBundleProducer.isGrouper(leaf));

        //Test VS with non grouper specific UsageContext
        UsageContext programUC = new UsageContext(new Coding(TransformProperties.hl7UsageContextType, "program", null), null);
        leaf.setUseContext(List.of(programUC));
        Assertions.assertFalse(ImportBundleProducer.isGrouper(leaf));
    }


}
