import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { DEFAULT_JOB_CONFIG } from '@/config'
import Queue from 'bull'
import Cache from '@/cache'
import { VSMSession } from '@/helpers/rolesHelper'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import Logger from '@/helpers/server/logger'
import FhirClient from '@/backend/clients/FhirCdrClient'

export interface VSPPackageBody extends NextApiRequest {
  body: {
    data?: {
      json: boolean
    }
    metadata?: any
  }
}

/**
 * Create a downloadable package for a VSP by calling $package operation
 * This calls the FHIR $package operation which bundles the VSP Library
 * with all referenced terminology resources
 */
const packageVSP = async (req: VSPPackageBody, res: NextApiResponse<Queue.Job | { error: string }>, session: VSMSession) => {
  const { data, metadata } = req.body || {}
  const vspId = req.query.id as string
  const userId = session.user.id

  Logger.getLogger().info(`=== Package VSP API Called ===`)
  Logger.getLogger().info(`VSP ID from query: ${vspId}`)
  Logger.getLogger().info(`User ID: ${userId}`)
  Logger.getLogger().info(`Request data: ${JSON.stringify(data)}`)

  if (!vspId) {
    return res.status(400).json({ error: 'VSP ID is required' })
  }

  if (!data) {
    return res.status(400).json({ error: 'Missing data for package export' })
  }

  try {
    // Read the VSP to validate it exists
    const vsp = await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    }) as fhir4.Library

    if (!vsp) {
      return res.status(404).json({ error: `VSP ${vspId} not found` })
    }

    Logger.getLogger().info(`Starting package export for VSP: ${vspId}`)

    // Queue the package job (this may take time)
    const job = await VSPPackageQueue.add(
      { 
        vspId,
        isJson: data.json,
        userId 
      }, 
      DEFAULT_JOB_CONFIG
    )

    await Cache.setNewJob({
      userId,
      jobId: job.id.toString(),
      type: JOB_TYPE.EXPORT,
      metadata: JSON.stringify(metadata)
    })

    Logger.getLogger().info(`Package job created for VSP ${vspId}: ${job.id}`)
    res.status(200).json(job)
  } catch (error: any) {
    Logger.getLogger().error('Error creating package job:', error)
    return res.status(500).json({ error: error?.message || 'Failed to create package job' })
  }
}

export default handler({
  POST: {
    action: packageVSP,
    access: ['admin', 'publisher', 'editor', 'implementer']
  }
})
