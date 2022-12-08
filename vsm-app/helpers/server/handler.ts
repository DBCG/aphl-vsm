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
    
    const isUnauthorized = session == null || 
      role == null ||
      (!access?.includes(role) && // check to see if roles in access
      access != null) // If no access is specified then allow all roles

    if (isUnauthorized) {
      return res.status(401).json({'error': 'Unauthorized'})
    }
    await action(req, res)
  } catch (error: any) {
    console.log(error)
    return res.status(500).json({'error': error?.message});
  }
}

export default handler