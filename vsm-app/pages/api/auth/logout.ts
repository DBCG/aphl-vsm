import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { VSMSession } from '@/helpers/rolesHelper'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  const session = <VSMSession>await getSession(res)
  if (req.method === 'GET') {
    if (session?.idToken != null) {
      // Initiating our own idp logout here from keycloak because next-auth doesn't support it properly
      return res.redirect(
        `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?id_token_hint=${session.idToken}&post_logout_redirect_uri=${process.env.NEXTAUTH_URL}`
      )
    } else {
      return res.redirect(`${process.env.NEXTAUTH_URL}`)
    }
  }
  return res.status(405).send('Method not supported')
}
