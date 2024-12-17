package org.opencds.cqf.ruler.ValueSetCache;

import org.hl7.fhir.instance.model.api.IBaseResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
@Service
public class FhirRedisService {

    @Autowired
    private RedisTemplate<String, IBaseResource> redisTemplate;

    public void saveData(String key, IBaseResource value) {
        redisTemplate.opsForValue().set(key, value);
    }

    public IBaseResource getData(String key) {
        return redisTemplate.opsForValue().get(key);
    }

}
