import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'

const handler = (methodHandlers: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const session = <VSMSession>await getSession(res)
  const methodFn = methodHandlers[req.method as string]
  logger.info(`Request: ${req?.method} ${req?.url}`)
  if (methodFn == null) {
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
    logger.error(`Something went wrong: ${error?.message} ${error?.stack}`)
    return res.status(500).json({ error: error?.message })
  }
}

export default handler
