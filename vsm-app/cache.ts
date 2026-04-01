import Redis, { RedisOptions } from 'ioredis'
import Logger from '@/helpers/server/logger'
import { JOB_EXPIRATION, CACHE_OPTIONS } from '@/config'
import { JOB_STATUS } from '@/constants'
// Parse Redis DB configuration
const redisDb = 1

type SetNewJobArgs = {
  userId: string
   jobId: string
   type: string
   metadata: string
}

const Cache = (function () {
  let instance: Redis | null = null // Holds the singleton instance
  let creationPromise: Promise<Redis> | null = null // Tracks ongoing creation

  async function createInstance(): Promise<Redis> {
    const options: RedisOptions = {
      ...CACHE_OPTIONS,
      lazyConnect: true,
      enableReadyCheck: true,
      showFriendlyErrorStack: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          throw new Error(`[Redis] Could not connect after ${times} attempts`)
        }
        return Math.min(times * 200, 1000)
      }
    }

    Logger.getLogger().info("Redis Options:")
    Logger.getLogger().info(JSON.stringify(options, null, 2))

    const redisInstance = new Redis(options)

    return new Promise((resolve, reject) => {
      redisInstance.on('error', (error: unknown) => {
        Logger.getLogger().error(`[Redis] Error connecting: ${error}`)
        reject(error)
      })

      redisInstance.on('wait', () => {
        Logger.getLogger().info('Redis Instance Created')
        resolve(redisInstance)
      })
    })
  }

  async function getInstance(): Promise<Redis> {
    if (instance) {
      return instance
    }

    if (!creationPromise) {
      Logger.getLogger().info('Creating Redis Instance')
      creationPromise = createInstance()
    }

    try {
      instance = await creationPromise
    } catch (error) {
      creationPromise = null // Reset the promise if creation fails
      throw error
    }

    return instance
  }

  async function getJobs(userId: string): Promise<any> {
    instance = await getInstance()
    if (instance == null) {
      throw new Error('Redis instance not available')
    }
    const jobIds = await instance.smembers(`user:${userId}:jobs`)
    return Promise.all(jobIds.map((jobId) => instance?.hgetall(`user:${userId}:job:${jobId}`)))
  }

  async function setNewJob({ userId, jobId, type, metadata} : SetNewJobArgs): Promise<void> {
    const cacheKey = `user:${userId}:job:${jobId}`
    instance = await getInstance()

    await instance.hset(cacheKey, {
      jobId,
      type,
      metadata,
      status: JOB_STATUS.IN_PROGRESS,
    })
    await instance.sadd(`user:${userId}:jobs`, jobId) // Adds job to user's job list
    await instance.expire(cacheKey, JOB_EXPIRATION) // Defaults to expires job in 24 hours
  }

  async function getJobType(userId: string, jobType: string = ''): Promise<any> {
    const allJobs = await getJobs(userId)
    return allJobs.filter((job: any) => jobType?.length > 0 && job.type === jobType)
  }

  return {
    getJobs,
    getJobType,
    getInstance,
    setNewJob
  }
})()

export default Cache
