import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import { getLogger } from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
import { logSimpleError } from './simpleHapiError'
import { is } from '../is'
import { AuthOptions } from '@/pages/api/auth/[...nextauth]'

const requestTypes = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"] as const
type requestTypes = typeof requestTypes[number]
type action<T extends NextApiRequest> = (req: T, res: NextApiResponse, session: VSMSession) => Promise<any>
// we have to do this intermediate step because TS doesn't support mapped generics nicely
type mapActionsToRequestTypes<U extends NextApiRequest, T extends { [k in keyof T]: action<U> }> = {
  [k in keyof T]?: T[k] extends action<infer V> ?
  V extends NextApiRequest ?
  { action: action<V>, access?: string[] } : never
  : never
}
type handlerObjs<T extends NextApiRequest> = mapActionsToRequestTypes<T, { [k in requestTypes]: action<T> }>
const handler = <U extends NextApiRequest, T extends handlerObjs<U>>(methodHandlers: T) => async <T extends NextApiRequest>(req: T, res: NextApiResponse): Promise<void> => {
  const session = <VSMSession>await getServerSession(req, res, AuthOptions)
  const methodFn = methodHandlers[req.method as requestTypes]
  // have to do "as any" because TS is annoying about readonlys
  if (!req.method || !(requestTypes.includes(req.method as any)) || !methodFn) {
    getLogger().error(`${req.method} not allowed for ${req.url}`)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  getLogger().info(`User: ${session?.user?.email} - Request: ${req?.method} ${req?.url}`)

  try {
    const { action, access } = methodFn
    const role = session?.user?.roles?.[0] // TODO: when users have more than one role we should look into modifying this
    const isAuthorized = (session != null && role != null && access?.includes(role)) || access == null // if access is unset, the route allows all roles
    if (!isAuthorized) {
      getLogger().error(`Role: ${role} is not authorized for ${req?.url}`)
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return await action(req, res, session)
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = is.operationOutcome(error) ? error?.issue?.[0]?.diagnostics : error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || JSON.stringify(error) || 'Unspecified error' })
  }
}

export default handler
