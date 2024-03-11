import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '@/fhirClients'
import handler from '@/helpers/server/handler'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'

interface ErrorResponse {
  error: string | string[]
}

// confirmed only need to validate JSON
const validatePackage = async (
  req: NextApiRequest,
  res: NextApiResponse<[] | ErrorResponse>): Promise<void> => {
  try {
    const { pkg } = req.body

    const validateParameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'resource',
          resource: pkg
        }
      ]
    }

    const validateResponse = await fhirCdrClient.operation({
      name: '$validate',
      input: JSON.stringify(validateParameters),
      method: 'POST',
      options: {
        headers: {
          'Content-Type': `application/fhir+json`,
          // ...fhirCdrClient.customHeaders
        }
      }
    })

    const breakingErrors = formatErrors(validateResponse)

    // validation failure does not break the workflow in the app
    return res.status(200).send({ error: breakingErrors?.map(e =>
      `Location: ${e.location!.join(' ')}: \n${e.diagnostics!}`) || [] })
  } catch (e) {
    logSimpleError(e, 'validate.ts')
    return res.status(500).send({ error: 'Resource validation failed' })
  }
}

// had to increase the size limit because the default 1mb was too small
// for the size of the response
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  }
}

export default handler({
  POST: {
    action: validatePackage,
    access: ['admin', 'editor']
  }
})