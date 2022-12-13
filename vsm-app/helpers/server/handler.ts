import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { VSMSession } from '@/helpers/rolesHelper'

const handler = (methodHandlers: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const session = <VSMSession>await getSession(res)

  const methodFn = methodHandlers[req.method as string]
  if (methodFn == null) {
    return res.status(405).json({'error': 'Method not allowed'});
  }

  try {
    const { action, access } = methodFn
    const role = session?.user?.roles?.[0] // TODO: when users have more than one role we should look into modifying this
    
    const isAuthorized = session != null || role != null || access?.includes(role) || access == null // if access is unset, the route allows all roles

    if (!isAuthorized) {
      return res.status(401).json({'error': 'Unauthorized'})
    }
    await action(req, res)
  } catch (error: any) {
    return res.status(500).json({'error': error?.message});
  }
}

export default handler
