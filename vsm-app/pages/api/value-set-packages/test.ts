import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'

const testEndpoint = async (req: NextApiRequest, res: NextApiResponse) => {
  Logger.getLogger().info('TEST ENDPOINT CALLED!')
  return res.status(200).json({ message: 'Test endpoint works!' })
}

export default handler({
  POST: { access: ['admin', 'editor'], action: testEndpoint }
})
