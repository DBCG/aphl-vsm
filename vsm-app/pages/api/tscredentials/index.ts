import type { NextApiRequest, NextApiResponse } from 'next'
import logger from '@/helpers/server/logger'
// keep the imports to the minumum, have only the service that will have all the business logic
import { TsCredentialService } from '@/backend/services/TsCredentialService'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { TerminologyServerCredentialsRequest } from '@/backend/model/TerminologyServerCredential'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { TerminologyServerCredentials } from '@/backend/model/TerminologyServerCredential'
import handler from '@/helpers/server/handler'

export type SaveCredentialsApiResponse = TerminologyServerCredentials | { error: string }

const saveCredentials = async (req: NextApiRequest, res: NextApiResponse<SaveCredentialsApiResponse | {}>) => {
  try {
      const credReq: TerminologyServerCredentialsRequest = handleSaveCredentialsRequest(req)
      const creds = await tsCredentialService.saveCredentials(credReq.userId, credReq.terminologyServerUrl, credReq.username, credReq.password)
      return res.status(200).send(creds)
    }
  catch (e: any) {
    logSimpleError(e)
    return res.status(400).json('Saving credentials failed.' )
  }
}

function handleSaveCredentialsRequest(req: NextApiRequest): TerminologyServerCredentialsRequest {
  try {
    return {
      userId: req.query['userId'] as string,
      terminologyServerUrl: req.query['terminologyServerUrl'] as string,
      username: req.query['username'] as string,
      password: req.query['password'] as string
    }
   } catch(e) {
      logSimpleError(req)
      logSimpleError(e)
      return {
        userId: "errorUserId",
        terminologyServerUrl: "errorTsServerUrl",
        username: "errorUSername",
        password: "errorPass"
      }
    }
  }


export default handler({
  POST: {
    action: saveCredentials
  }
})
