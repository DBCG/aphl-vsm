package org.opencds.cqf.ruler;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.cr.common.IRepositoryFactory;
import ca.uhn.fhir.rest.server.provider.ResourceProviderFactory;
import org.opencds.cqf.external.annotations.OnR4Condition;
import org.opencds.cqf.ruler.r4.CaseReportingOperationProvider;
import org.opencds.cqf.ruler.r4.KnowledgeArtifactProcessor;
import org.opencds.cqf.ruler.r4.MeasureDataProcessProvider;
import org.opencds.cqf.ruler.r4.ProcessMessageProvider;
import org.opencds.cqf.ruler.r4.ValueSetSynonymUpdateInterceptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.opencds.cqf.ruler.ValueSetCache.RedisConfig;
@Configuration
@Import(RedisConfig.class)
@ConditionalOnProperty(prefix = "hapi.fhir.casereporting", name = "enabled", havingValue = "true", matchIfMissing = true)
public class CaseReportingConfig {
	@Bean
	public CaseReportingProperties caseReportingProperties() {
		return new CaseReportingProperties();
	}

	@Bean
	@Conditional(OnR4Condition.class)
	public MeasureDataProcessProvider r4MeasureDataProcessor() {
		return new MeasureDataProcessProvider();
	}

	@Bean
	@Conditional(OnR4Condition.class)
	public ProcessMessageProvider r4ProcessMessageProvider() {
		return new ProcessMessageProvider();
	}

	@Bean
	@Conditional(OnR4Condition.class)
	public CaseReportingOperationProvider r4CaseReportingOperationProvider(FhirContext fhirContext) {
		return new CaseReportingOperationProvider(fhirContext);
	}

	@Bean
	@Conditional(OnR4Condition.class)
	public KnowledgeArtifactProcessor r4KnowledgeArtifactProcessorProvider() {
		return new KnowledgeArtifactProcessor();
	}

	@Bean
	@Conditional(OnR4Condition.class)
	public ValueSetSynonymUpdateInterceptor valueSetInterceptor(IRepositoryFactory repositoryFactory) {
		return new ValueSetSynonymUpdateInterceptor(this.caseReportingProperties().getRckmsSynonymsUrl(), repositoryFactory);
	}

	@Bean
	CaseReportingProviderLoader caseReportingProviderLoader(FhirContext theFhirContext, ResourceProviderFactory theResourceProviderFactory) {
		return new CaseReportingProviderLoader(theFhirContext, theResourceProviderFactory);
	}
}
