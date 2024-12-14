import Redis, { RedisOptions } from 'ioredis'
import Logger from '@/helpers/server/logger'
import { Job } from 'bull'
import { JOB_STATUS } from './constants'

// Parse Redis DB configuration
const redisDb = 1

const Cache = (function () {
  let instance: Redis | null = null // Holds the singleton instance
  let creationPromise: Promise<Redis> | null = null // Tracks ongoing creation

  async function createInstance(): Promise<Redis> {
    const options: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      lazyConnect: true,
      enableReadyCheck: true,
      db: redisDb,
      password: process.env.REDIS_PASSWORD || '',
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

    const redisInstance = new Redis(options)

    return new Promise((resolve, reject) => {
      redisInstance.on('error', (error: unknown) => {
        Logger.getLogger().error('[Redis] Error connecting', error)
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

  async function getJobType(userId: string, jobType: string = ''): Promise<any> {
    const allJobs = await getJobs(userId)
    return allJobs.filter((job: any) => jobType?.length > 0 && job.type === jobType)
  }

  return {
    getJobs,
    getJobType,
    getInstance
  }
})()

export default Cache
