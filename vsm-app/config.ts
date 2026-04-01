import Queue from 'bull'
// DB 1 is used for user cache details
// DB 2 is used for the worker queue jobs
// Redis configuration — REDIS_HOST may include port (e.g., "host:6379")
const [REDIS_HOST, REDIS_PORT] = (process.env.REDIS_HOST || 'localhost').split(':')
const redisPort = REDIS_PORT || '6379'
const JOB_EXPIRATION = process.env.JOB_EXPIRATION || 86400
const REDIS_TLS = process.env.REDIS_TLS === 'true'
const REDIS_TLS_REJECT_UNAUTHORIZED = process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'true'

const REDIS_OPTIONS = {
  host: REDIS_HOST || 'localhost',
  port: parseInt(redisPort, 10),
  tls: REDIS_TLS
      ? {
        rejectUnauthorized: REDIS_TLS_REJECT_UNAUTHORIZED || false,
      }
      : undefined,
  password: process.env.REDIS_PASSWORD || '',
}

const CACHE_OPTIONS = {
  ...REDIS_OPTIONS,
  db: 1,
}

const QUEUE_OPTIONS = {
  redis: {
    ...REDIS_OPTIONS,
    db: 2,
  },
}

const DEFAULT_JOB_CONFIG = {
  removeOnComplete: {
    age: 24 * 3600 // keep up to 24 hours
  },
  removeOnFail: {
    age: 24 * 3600 // keep up to 24 hours
  },
  redis: REDIS_OPTIONS,
} as Queue.JobOptions

export {
  JOB_EXPIRATION,
  DEFAULT_JOB_CONFIG,
  REDIS_OPTIONS,
  QUEUE_OPTIONS,
  CACHE_OPTIONS,
}
