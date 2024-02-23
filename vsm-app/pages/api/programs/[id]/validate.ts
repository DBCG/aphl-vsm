import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '@/fhirClients'
import handler from '@/helpers/server/handler'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'

interface ErrorResponse {
  error: string | string[]
}

// confirmed only need to validate JSON
const validatePackage = async (req: NextApiRequest, res: NextApiResponse<[] | ErrorResponse>): Promise<void> => {
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

    // validate returns an OperationOutcome whether there are issues or not
    // if it's successful, it just returns one informational issue (severity: information)
    const validateResponse = await fetch(`${fhirCdrClient.baseUrl}/$validate`, {
      body: JSON.stringify(validateParameters),
      method: 'POST',
      headers: {
        'Accept': 'application/fhir+json',
        'Content-Type': `application/fhir+json`,
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    }).then(x => x.json())

    const breakingErrors = formatErrors(validateResponse)

    // validation failure does not break the workflow in the app
    return res.status(200).send({ error: breakingErrors?.map(e =>
      `Location: ${e.location!.join(' ')}: \n${e.diagnostics!}`) || [] })
  } catch (e) {
    logSimpleError(e)
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
  },
  // specifies the maximum allowed duration for this function to execute (in seconds)
  maxDuration: 5,
}

export default handler({
  POST: {
    action: validatePackage,
    access: ['admin', 'editor']
  }
})