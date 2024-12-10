// DB 1 is used for user cache details
// DB 2 is used for the worker queue jobs
// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST
const QUEUE_REDIS_URL = `redis://${REDIS_HOST}:6379/2`
const CACHE_REDIS_URL = `redis://${REDIS_HOST}:6379/1` 
const JOB_EXPIRATION = process.env.JOB_EXPIRATION || 86400

export { QUEUE_REDIS_URL, CACHE_REDIS_URL, JOB_EXPIRATION }
