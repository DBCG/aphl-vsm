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
      const creds = tsCredentialService.saveCredentials(credReq.userId, credReq.terminologyServerUrl, credReq.username, credReq.password)
      return res.status(200).send(creds)
    }
  catch (e: any) {
    logSimpleError(e)
    return res.status(400).json('Search for program failed.' )
  }
}

function handleSaveCredentialsRequest(req: NextApiRequest): TerminologyServerCredentialsRequest {
  return {
    userId: req.query['userId'] as string,
    terminologyServerUrl: req.query['terminologyServerUrl'] as string,
    username: req.query['username'] as string,
    password: req.query['password'] as string
  }
}

export default handler({
  POST: {
    action: saveCredentials
  }
})
