package org.opencds.cqf.ruler.ValueSetCache;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import ca.uhn.fhir.context.FhirContext;

@Configuration
public class RedisConfig {

    @Value("${redis.host:redis}")
    private String host;

    @Value("${redis.port:6379}")
    private int port;

    @Value("${redis.database:4}")
    private int database;

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        // Configure the connection to Redis
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(host);
        config.setPort(port);
        config.setDatabase(database); // Set to database 4
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