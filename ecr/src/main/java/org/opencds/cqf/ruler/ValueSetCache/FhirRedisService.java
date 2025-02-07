package org.opencds.cqf.ruler.ValueSetCache;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisTemplate;
public class FhirRedisService {

	private static final Logger log = LoggerFactory.getLogger(FhirRedisService.class);
    private final RedisTemplate<String, IBaseResource> redisTemplate;

    FhirRedisService(RedisTemplate<String, IBaseResource> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    public void saveData(String key, IBaseResource value) {
        redisTemplate.opsForValue().set(key, value);
    }

    public IBaseResource getData(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public boolean isConnected() {
        try (RedisConnection connection = redisTemplate.getConnectionFactory().getConnection()) {
            String pingResponse = connection.ping();
            if ("PONG".equals(pingResponse)) {
                return true;
            } else {
                log.error("Redis ping response: " + pingResponse);
            }
        } catch (Exception e) {
            log.error("Failed to connect to Redis: " + e.getMessage());
        }
        return false;
    }

}
