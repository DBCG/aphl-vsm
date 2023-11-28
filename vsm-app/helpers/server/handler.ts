import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
import { logSimpleError } from './simpleHapiError'
import { is } from '../is'
import { AuthOptions } from '@/pages/api/auth/[...nextauth]'

const handler = (methodHandlers: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const session = <VSMSession>await getServerSession(req, res, AuthOptions)
  const methodFn = methodHandlers[req.method as string]
  logger.info(`Request: ${req?.method} ${req?.url}`)
  if (methodFn == null) {
    logger.error(`${req.method} not allowed for ${req.url}`)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, access } = methodFn
    const role = session?.user?.roles?.[0] // TODO: when users have more than one role we should look into modifying this
    const isAuthorized = (session != null && role != null && access?.includes(role)) || access == null // if access is unset, the route allows all roles
    if (!isAuthorized) {
      logger.error(`Role: ${role} is not authorized for ${req?.url}`)
      return res.status(401).json({ error: 'Unauthorized' })
    }
    await action(req, res, session)
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = is.operationOutcome(error) ? error?.issue?.[0]?.diagnostics : error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || JSON.stringify(error) || 'Unspecified error' })
  }
}

export default handler
