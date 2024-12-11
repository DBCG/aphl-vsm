package org.opencds.cqf.ruler.ValueSetCache;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import ca.uhn.fhir.context.FhirContext;

@Configuration
public class RedisConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        // Configure the connection to Redis
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName("localhost");
        config.setPort(6379);
        config.setDatabase(4); // Set to database 4
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisTemplate<String, IBaseResource> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, IBaseResource> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Use String serializer for keys
        template.setKeySerializer(new StringRedisSerializer());

        // Use custom JSON serializer for values
        template.setValueSerializer(new RedisFhirParser(FhirContext.forR4Cached()));


        template.afterPropertiesSet();
        return template;
    }
}