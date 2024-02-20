import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '@/fhirClients'
import handler from '@/helpers/server/handler'
// import { ErrorList, formatErrors } from './package'
// import xmlParser from 'fast-xml-parser'
// import xmlParser from 'libxmljs'

const formatErrors = (opOutcome: fhir4.OperationOutcome) => {
  return opOutcome?.issue?.filter(iss => iss.severity === 'fatal' || iss.severity === 'error') || []
}

// should take in data as json or XML... would be easier to only validate json
const validatePackage = async (req: NextApiRequest, res: NextApiResponse<ErrorList | null>): Promise<void> => {
  try {
    console.log('req.headers: ', req.headers)
    // build body as xml or Json based on formatType
    const { pkg, formatType } = req.body
    console.log('pkg: ', pkg)

    const pkgJson = JSON.stringify(pkg)

    console.log('json: ', pkgJson)

    const validateParameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'resource',
          // curly braces in interpolated items causing xml parser to fail (?)
          // resource: removeBracesIfString(pkgToValidate)
          resource: pkg
        }
      ]
    }

    const stringifiedParameters = JSON.stringify(validateParameters)
    
    const validateResponse = await fetch(`${fhirCdrClient.baseUrl}/$validate`, {
      body: stringifiedParameters,
      method: 'POST',
      headers: {
        'Accept': 'application/fhir+json',
        'Content-Type': `application/fhir+${formatType}`,
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    }).then(x => {
      return x.json()
      console.log('x: ', x)
      console.log(x.headers)
      // formatType === 'json' ? x.json() : x.text()
  })

    // const response = await validateResponse.json()

    // console.log('response: ', validateResponse.indexOf('{'))

    if (formatType === 'json') {
      console.log('validate response json:')
      console.log(validateResponse)
    } else {
      console.log('validate response text:')
      console.log(validateResponse)
    }

    const breakingErrors = formatErrors(validateResponse)

    return res.status(200).send(breakingErrors)
  } catch (e) {
    console.log('error here in validate: ', e)
    logSimpleError(e)
    return res.status(500).send({ error: 'error text'})
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
  // Specifies the maximum allowed duration for this function to execute (in seconds)
  maxDuration: 5,
}

export default handler({
  POST: {
    action: validatePackage,
    access: ['admin', 'editor']
  }
})