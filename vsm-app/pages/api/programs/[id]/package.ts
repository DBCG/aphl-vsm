import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { DEFAULT_JOB_CONFIG, JOB_EXPIRATION } from '@/config'
import Queue from 'bull'
import Cache from '@/cache'
import { VSMSession } from '@/helpers/rolesHelper'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import PackageQueue from '@/worker/PackageQueue'
import { getProgram, getGrouperLibrary, getGrouperValuesets } from '@/helpers/server/serverLibraryHelper'
import { getLeafUrlsFromGrouper } from '@/helpers/valueSetHelpers'
import { uniq } from 'lodash'

export interface ExpectedPackageBody extends NextApiRequest {
  body: {
    data?: {
      parameters: fhir4.Parameters
      json: boolean
      useV2: boolean
    }
    planDefinition?: fhir4.PlanDefinition
    targetVersion?: string
    metadata?: any
  }
}
export type PackageResponse = fhir4.Bundle | string | { error: string }
// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML

// Pre-emptive check for leaf vs to ensure conditions are present
const validateConditionLeafVs = async (programId: string) => {
  const program = await getProgram(programId)
  const grouperLibrary = await getGrouperLibrary(program)
  const grouperValueSets = await getGrouperValuesets(grouperLibrary)

  // @ts-ignore
  const leafValueSetCanonicals = uniq(grouperValueSets.reduce((acc, i) => [...acc, ...getLeafUrlsFromGrouper(i)], [] as string[]))
  const missingConditionsVs = [] as string[]
  program.relatedArtifact?.forEach((relatedArtifact) => {
    const vsCanonical = relatedArtifact?.resource
    if (vsCanonical && leafValueSetCanonicals.includes(vsCanonical)) {
      const conditionPresent = relatedArtifact?.extension?.find((i) => i?.url?.endsWith('vsm-valueset-condition'))
      if (!conditionPresent) {
        missingConditionsVs.push(vsCanonical.split('|')?.[0])
      }
    }
  })

  if (missingConditionsVs.length > 0) {
    throw new Error(`Failed pre-checks for Missing condition for ValueSets: ${missingConditionsVs.join('\n')}`)
  }
}

const crmiPackage = async (req: ExpectedPackageBody, res: NextApiResponse<Queue.Job>, session: VSMSession) => {
  const { data, planDefinition, targetVersion, metadata } = req.body || {}
  if (!data?.parameters) {
    throw new Error('Missing parameters for Export')
  }
  const userId = session.user.id
  try {
    await validateConditionLeafVs(req.query.id as string)
  } catch (error) {
    // @ts-ignore
    return res.status(400).json({ error: error?.message })
  }
  const job = await PackageQueue.add({ data, planDefinition, targetVersion, programId: req.query.id as string, userId }, DEFAULT_JOB_CONFIG)

  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  await cache.hset(cacheKey, {
    jobId: job.id,
    status: JOB_STATUS.IN_PROGRESS,
    type: JOB_TYPE.EXPORT,
    metadata: JSON.stringify(metadata)
  })
  await cache.sadd(`user:${userId}:jobs`, job.id) // Adds job to user's job list
  await cache.expire(cacheKey, JOB_EXPIRATION) // Defaults to expires job in 24 hours
  res.status(200).json(job)
}

export default handler({
  POST: {
    action: crmiPackage,
    access: ['admin', 'editor']
  }
})
