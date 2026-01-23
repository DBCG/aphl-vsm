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
import Logger from '@/helpers/server/logger'

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

// Pre-emptive check for leaf VS to ensure conditions are present
const validateConditionLeafVs = async (programId: string) => {
  const program = await getProgram(programId)
  const grouperLibrary = await getGrouperLibrary(program)
  const grouperValueSets = await getGrouperValuesets(grouperLibrary)

  // Get all leaf VS URLs from grouper and remove version info
  // @ts-ignore
  const leafValueSetCanonicals = uniq(grouperValueSets.reduce((acc, i) => [...acc, ...getLeafUrlsFromGrouper(i)], [] as string[])).map((url) => url?.split("|")[0])

  const missingConditionsVs: string[] = []

  program.relatedArtifact?.forEach((relatedArtifact) => {
    const vsCanonical = relatedArtifact?.resource?.split('|')[0] // ignore version
    if (vsCanonical && leafValueSetCanonicals.includes(vsCanonical)) {
      // Check for crmi-intendedUsageContext extension with code 'focus'
      const usageContextPresent = relatedArtifact?.extension?.find((ext) =>
        ext?.url?.endsWith('crmi-intendedUsageContext') &&
        ext?.valueUsageContext &&
        ext.valueUsageContext.code?.code === 'focus'
      )
      if (!usageContextPresent) {
        missingConditionsVs.push(vsCanonical)
      }
    }
  })

  if (missingConditionsVs.length > 0) {
    throw new Error(
      `Pre-check failed. To export, please add at least 1 'focus' usage context to the following ValueSets: ${missingConditionsVs.join('\n')}`
    )
  }
}

const crmiPackage = async (req: ExpectedPackageBody, res: NextApiResponse<Queue.Job>, session: VSMSession) => {
  const { data, planDefinition, targetVersion, metadata } = req.body || {}
  if (!data?.parameters) {
    throw new Error('Missing parameters for Export')
  }
  const userId = session.user.id
  try {
    Logger.getLogger().info('Validating conditions for export on program: ' + req.query.id)
    await validateConditionLeafVs(req.query.id as string)
    Logger.getLogger().info('Validated for program: ' + req.query.id)
  } catch (error) {
    // @ts-ignore
    return res.status(400).json({ error: error?.message })
  }
  const job = await PackageQueue.add({ data, planDefinition, targetVersion, programId: req.query.id as string, userId, convertToCSV: metadata?.fileType === 'csv'}, DEFAULT_JOB_CONFIG)

  await Cache.setNewJob({
    userId,
    jobId: job.id.toString(),
    type: JOB_TYPE.EXPORT,
    metadata: JSON.stringify(metadata)
  })
  
  res.status(200).json(job)
}

export default handler({
  POST: {
    action: crmiPackage,
    access: ['admin', 'editor']
  }
})
