import type { NextApiRequest, NextApiResponse } from 'next'
import logger from '@/helpers/server/logger'
// keep the imports to the minumum, have only the service that will have all the business logic
import tsCredentialService from '@/backend/services/TsCredentialService'


const saveCredentials = async (req: NextApiRequest, res: NextApiResponse<ProgramApiResponse | {}>) => {
  try {
      credReq: SaveCredReq = handleRequest(req)
      tsCredentialService.saveCredentials(credReq.userId, credReq.terminologyServer, credReq.username, credReq.password)
    }
  } catch (e: any) {
    logSimpleError(e)
    handleError(e) // here we check on the error and return correct http codes (401 if unauthorized, 400 if ts does not exist, etc)
  }
}

export default handler({
  POST: {
    action: saveCredentials
  }
})
