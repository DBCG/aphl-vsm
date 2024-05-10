package com.ecr.r4;

import org.hl7.fhir.r4.model.*;
import org.junit.jupiter.api.Test;
import com.ecr.CaseReportingConfig;
import org.opencds.cqf.ruler.test.RestIntegrationTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@DirtiesContext
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = {
		CaseReportingConfig.class }, properties = { "hapi.fhir.fhir_version=r4", "hapi.fhir.cr.enabled=true", })
class ProcessMessageProviderIT extends RestIntegrationTest {
	@Test
	void testProcessMessage() {
		Bundle bundle = (Bundle) loadResource("example-eicr.json");

		Bundle returnBundle = getClient().operation().onServer()
				.named("$process-message-bundle")
				.withParameter(Parameters.class, "content", bundle)
				.returnResourceType(Bundle.class)
				.execute();

		assertNotNull(returnBundle);
		assertNotNull(getClient().read().resource(Patient.class).withId("patient-12742542").execute());
		assertNotNull(getClient().read().resource(Encounter.class).withId("encounter-97953898").execute());
		assertNotNull(getClient().read().resource(MeasureReport.class).withId("diabetes-mp").execute());
	}
}
