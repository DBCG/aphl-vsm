package org.opencds.cqf.ruler.ValueSetCache;

import org.hl7.fhir.instance.model.api.IBaseResource;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.rest.server.exceptions.InternalErrorException;
import redis.clients.jedis.Jedis;

public class FhirRedisService {

    private final RedisConfig redisConfig;
    private final FhirContext myCtx;
    private final RedisFhirParser myParser;

    public FhirRedisService(FhirContext ctx) {
        this.redisConfig = new RedisConfig();
        this.myCtx = ctx;
        this.myParser = new RedisFhirParser(myCtx);
    }

    public void write(String key, IBaseResource value) {
        try (Jedis jedis = redisConfig.getConnection()) {
            String serializedValue = myParser.serialize(value);
            jedis.set(key, serializedValue);
        } catch (Exception e) {
            throw new InternalErrorException("Failed to write to ValueSetCache", e);
        }
    }

    public IBaseResource read(String key) {
        try (Jedis jedis = redisConfig.getConnection()) {
            String jsonValue = jedis.get(key);
            if (jsonValue == null) {
                return null;
            }
            return myParser.deserialize(jsonValue);
        } catch (Exception e) {
            throw new InternalErrorException("Failed to read from ValueSetCache", e);
        }
    }

    public void closeService() {
        redisConfig.closePool();
    }

    public FhirContext getFhirContext() {
        return myCtx;
    }
}
