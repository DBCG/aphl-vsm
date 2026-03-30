import Cache from '@/cache'
import { DEFAULT_JOB_CONFIG, JOB_EXPIRATION, QUEUE_OPTIONS } from '@/config'
import { changeLogDiffOperation } from '@/helpers/exportExcelHelper'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import Queue from 'bull'
import Logger from '@/helpers/server/logger'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'

const ChangeLogQueue = new Queue('changeLogCompare', QUEUE_OPTIONS)

const originalAdd = ChangeLogQueue.add

// Overriding the add method
ChangeLogQueue.add = async function (...args) {
  const data = args[0]
  const userId = data.userId
  
  const job = await originalAdd.apply(this, [data, DEFAULT_JOB_CONFIG])
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  await cache.hset(cacheKey, {
    jobId: job.id,
    status: JOB_STATUS.IN_PROGRESS,
    type: JOB_TYPE.CHANGE_LOG,
    metadata: JSON.stringify(data?.metadata)
  })
  await cache.sadd(`user:${userId}:jobs`, job.id) // Adds job to user's job list
  await cache.expire(cacheKey, JOB_EXPIRATION) // Defaults to expires job in 24 hours
  return job
}

ChangeLogQueue.process(async function (job: any, done) {
  const { baseProgramId, targetProgramId, userId } = job.data
  const cacheKey = `user:${userId}:job:${job.id}`

  const parameters: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'source',
        valueString: `Library/${baseProgramId}`
      },
      {
        name: 'target',
        valueString: `Library/${targetProgramId}`
      },
      {
        name: 'compareComputable',
        valueBoolean: true
      },
      {
        name: 'compareExecutable',
        valueBoolean: true
      }
    ]
  }
  const input = await addTerminologyEndpointToParameters({parameters, userId})
  const changelogData = await changeLogDiffOperation(baseProgramId, targetProgramId, input) as fhir4.OperationOutcome | fhir4.Binary
  const cache = await Cache.getInstance()

  if (changelogData?.resourceType === 'OperationOutcome') {
    const error = changelogData?.issue?.map((e) => e?.diagnostics!).join(', ') || 'Error encountered while generating Comparison data'
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
  } else if (changelogData?.resourceType === 'Binary') {

    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)
    const data = atob(changelogData.data!)
    done(null, data)
  } else {
    Logger.getLogger().error('Unknown error while generating Comparison data')
    Logger.getLogger().error(JSON.stringify(changelogData))
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', 'Unknown error while generating Comparison data')
    done(null, { error: 'Unknown error while generating Comparison data' })
  }
})

export default ChangeLogQueue
