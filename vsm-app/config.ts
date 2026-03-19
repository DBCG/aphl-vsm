import Queue from 'bull'
// DB 1 is used for user cache details
// DB 2 is used for the worker queue jobs
// Redis configuration — REDIS_HOST may include port (e.g., "host:6379")
const [REDIS_HOST, REDIS_PORT] = (process.env.REDIS_HOST || 'localhost').split(':')
const redisPort = REDIS_PORT || '6379'
const QUEUE_REDIS_URL = `redis://${REDIS_HOST}:${redisPort}/2`
const CACHE_REDIS_URL = `redis://${REDIS_HOST}:${redisPort}/1`
const JOB_EXPIRATION = process.env.JOB_EXPIRATION || 86400

const DEFAULT_JOB_CONFIG =  {
  removeOnComplete: {
    age: 24 * 3600 // keep up to 24 hours
  },
  removeOnFail: {
    age: 24 * 3600 // keep up to 24 hours
  }
} as Queue.JobOptions

export { QUEUE_REDIS_URL, CACHE_REDIS_URL, JOB_EXPIRATION, DEFAULT_JOB_CONFIG }
