import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'

export interface ImportRequest extends NextApiRequest {
  body: fhir4.Parameters
}

const importERSD = async (
  req: ImportRequest,
  res: NextApiResponse<fhir4.OperationOutcome | {error: string}>): Promise<void> => {
  try {
    const importResponse = await FhirClient.getInstance().operation({
      name: "$ersd-v2-import",
      method: 'POST',
      input: JSON.stringify(req.body),
      options: {
        headers: {
          'Content-Type': `application/fhir+json`
        }
      }
    }) as fhir4.OperationOutcome

    return res.status(200).send(importResponse)
  } catch (error: any) {
    logSimpleError(error, 'import.ts')
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}

// had to increase the size limit because the default 1mb was too small
// for the size of the response
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  }
}

export default handler({
  POST: {
    action: importERSD,
    access: ['admin']
  }
})