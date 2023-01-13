import Redis, { RedisOptions } from 'ioredis';

export default (function(){
  function Cache() {
    try {
      const options: RedisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        lazyConnect: true,
        password: process.env.REDIS_PASSWORD || '',
        showFriendlyErrorStack: true,
        enableAutoPipelining: true,
        maxRetriesPerRequest: 0,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.error(`[Redis] Could not connect after ${times} attempts`)
            // throw new Error(`[Redis] Could not connect after ${times} attempts`);
          }
  
          return Math.min(times * 200, 1000);
        },
      };
  
      const instance = new Redis(options);
  
      instance.on('error', (error: unknown) => {
        console.error('[Redis] Error connecting', error);
      });
      console.log('Redis Instance Created')
      return instance;
    } catch (e) {
      console.error('[Redis] Error connecting')
      return null;
      // throw new Error(`[Redis] Could not create a Redis instance`);
    }
  }
  let instance: Redis | null;
  return {
      getInstance: function(){
          if (instance == null) {
            console.log('Creating Redis Instance')
            instance = Cache();
          }
          return instance;
      }
 };
})();