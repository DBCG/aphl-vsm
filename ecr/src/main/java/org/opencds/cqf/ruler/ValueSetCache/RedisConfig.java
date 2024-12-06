package org.opencds.cqf.ruler.ValueSetCache;

import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

public class RedisConfig {

    private final JedisPool jedisPool;

    public RedisConfig() {
        // Fetch Redis details from environment variables
        String redisHost = System.getProperty("REDIS_HOST", "localhost"); // Default to "localhost"
        int redisPort = Integer.parseInt(System.getProperty("REDIS_PORT", "6379")); // Default to 6379
        int redisDb = Integer.parseInt(System.getProperty("REDIS_DB", "4")); // Default to DB 4

        // Configure Jedis connection pool
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(10); // Maximum number of connections
        poolConfig.setMaxIdle(5);  // Maximum idle connections
        poolConfig.setMinIdle(1);  // Minimum idle connections
        poolConfig.setTestOnBorrow(true); // Test connection before borrowing
        poolConfig.setTestOnReturn(true); // Test connection before returning

        this.jedisPool = new JedisPool(poolConfig, redisHost, redisPort, 2000, null, redisDb);
    }

    public Jedis getConnection() {
        return jedisPool.getResource();
    }

    public void closePool() {
        if (jedisPool != null) {
            jedisPool.close();
        }
    }
}
