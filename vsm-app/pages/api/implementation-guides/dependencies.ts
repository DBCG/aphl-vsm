import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import DependencyQueue from '@/worker/DependencyQueue'
import { DEFAULT_JOB_CONFIG } from '@/config'
import { VSMSession } from '@/helpers/rolesHelper'

interface DependenciesResponse {
  success: boolean
  jobId?: string
  error?: string
}

/**
 * Start a background job to fetch dependencies
 * Returns job ID immediately for status polling
 */
const startDependencyFetch = async (req: NextApiRequest, res: NextApiResponse<DependenciesResponse>, session: VSMSession) => {
  try {
    const userId = session.user.id
    const { igCanonical, igPackageId } = req.query

    if (!igCanonical || typeof igCanonical !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: igCanonical'
      })
    }

    if (!igPackageId || typeof igPackageId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: igPackageId (needed to download package)'
      })
    }

    // Parse canonical to validate it has version
    const [igUrl, igVersion] = igCanonical.split('|')

    if (!igVersion) {
      return res.status(400).json({
        success: false,
        error: 'IG canonical must include version (e.g., |6.1.0)'
      })
    }

    Logger.getLogger().info(`Starting dependency fetch job for ${igPackageId}@${igVersion}`)

    // Queue the job (cache is set by DependencyQueue.add override)
    const job = await DependencyQueue.add(
      {
        igCanonical,
        igPackageId,
        userId
      },
      DEFAULT_JOB_CONFIG
    )

    Logger.getLogger().info(`Dependency fetch job queued with ID: ${job.id}`)

    return res.status(200).json({
      success: true,
      jobId: job.id.toString()
    })

  } catch (error: any) {
    Logger.getLogger().error('Error starting dependency fetch job:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start dependency fetch'
    })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: startDependencyFetch }
})
