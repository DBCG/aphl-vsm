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
export type GetCredentialsApiResponse = TerminologyServerCredentials[] | { error: string }

const saveCredentials = async (req: NextApiRequest, res: NextApiResponse<SaveCredentialsApiResponse | {}>) => {
  try {
      const credReq: TerminologyServerCredentialsRequest = handleSaveCredentialsRequest(req)
      const creds = await tsCredentialService.saveCredentials(credReq.userId, credReq.terminologyServerId, credReq.username, credReq.password)
      return res.status(200).send(creds)
    }
  catch (e: any) {
    logSimpleError(e)
    return res.status(400).json('Saving credentials failed' )
  }
}

const updateCredentials = async (req: NextApiRequest, res: NextApiResponse<SaveCredentialsApiResponse | {}>) => {
  try {
      const credReq: TerminologyServerCredentialsRequest = handleSaveCredentialsRequest(req)
      const creds = await tsCredentialService.updateCredentials(credReq.userId, credReq.terminologyServerId, credReq.username, credReq.password)
      return res.status(200).send(creds)
    }
  catch (e: any) {
    logSimpleError(e)
    return res.status(400).json('Updating credentials failed' )
  }
}

function handleSaveCredentialsRequest(req: NextApiRequest): TerminologyServerCredentialsRequest {
  try {
    return {
      userId: req.body.userId as string,
      terminologyServerId: req.body.terminologyServerUrl,
      username: req.body.username,
      password: req.body.password
    }
   } catch(e) {
      logSimpleError(req)
      logSimpleError(e)
      return {
        userId: "errorUserId",
        terminologyServerId: "errorTsServerUrl",
        username: "errorUSername",
        password: "errorPass"
      }
    }
  }

const getCredentials = async (req: NextApiRequest, res: NextApiResponse<GetCredentialsApiResponse | {}>) => {
  try {
      const creds = await tsCredentialService.getAllCredentials(req.query['userId'] as string)
      return res.status(200).send(creds)
    }
  catch (e: any) {
    logSimpleError(e)
    return res.status(400).json('Getting credentials failed' )
  }
}

export default handler({
  GET: {
    action: getCredentials
  },
  POST: {
    action: saveCredentials
  },
  PUT: {
    action: updateCredentials
  }
})
