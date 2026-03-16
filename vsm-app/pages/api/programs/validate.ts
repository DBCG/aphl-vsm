import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'

export interface ValidateErrorResponse {
  error: string | string[]
}
export interface ValidateBody extends NextApiRequest {
  body: {
    pkg: fhir4.Bundle | string
  }
}

// confirmed only need to validate JSON
const validatePackage = async (
  req: ValidateBody,
  res: NextApiResponse<ValidateErrorResponse>): Promise<void> => {
  try {
    const { pkg } = req.body
    let parameters: string;
    // string means XML
    if (typeof pkg === 'string') {
      parameters = `<Parameters xmlns='http://hl7.org/fhir'>
                      <parameter>
                        <name value='resource'/>
                        <resource>
                            ${pkg}
                        </resource>
                      </parameter>
                    </Parameters>`
    } else {
      const validateParameters: fhir4.Parameters = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'resource',
            resource: pkg
          }
        ]
      }
      parameters = JSON.stringify(validateParameters)
    }
    const validateResponse = (await fetch(FhirClient.getInstance().baseUrl + '/$validate', {
      method: 'POST',
      body: parameters,
      headers: {
        'Content-Type': `application/fhir+${typeof pkg === "string" ? "xml" : "json"}`,
        ...FhirClient.getInstance().customHeaders
      }
    }).then((response => {
      if (typeof pkg === "string") {
        return response.text()
      } else {
        return response.json()
      }
    }))) as fhir4.OperationOutcome | string

    const nonBreakingErrors = formatErrors(validateResponse, "Unknown error performing validation")

    // validation failure does not break the workflow in the app
    return res.status(200).send({
      error: nonBreakingErrors?.map(e =>
        `Location: ${e.location?.join(' ') || "[Unknown Location]"}: \n${e.diagnostics || "[Unknown Issue]"}`) || []
    })
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
      sizeLimit: '50mb',
    },
  }
}

export default handler({
  POST: {
    action: validatePackage,
    access: ['admin', 'publisher', 'editor']
  }
})