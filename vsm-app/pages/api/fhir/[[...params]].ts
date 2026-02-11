import { NextApiRequest, NextApiResponse } from 'next'
import FhirCdrClient from '@/backend/clients/FhirCdrClient'
import FhirKitClient from "fhir-kit-client";
import handler from '@/helpers/server/handler'
import generatePassthroughOpOutcome from '@/helpers/generatePassthroughOpOutcome'
import { IncomingHttpHeaders } from 'http'
import { generateLargeRequestOpOutcome } from '@/helpers/largeRequestOpOutcome'
import { Agent, fetch as f } from 'undici'

type OptionHeaders = Record<string, string>

interface InfoIssue {
  severity: 'information'
  code: 'informational'
  details?: any
  diagnostics?: string
  location?: string
  expression?: string
}

interface SuccessIssue {
  severity: 'success'
  code: 'success'
  details?: any
  diagnostics?: string
  location?: string
  expression?: string
}

type SuccessfulOpOutcome = fhir4.OperationOutcome & { issue: (InfoIssue|SuccessIssue)[] }

const is = {
  successfulOpOutcome: (resource: any): resource is SuccessfulOpOutcome => {
    const successCodes = ['success', 'informational']
    const failureExists = resource?.issue?.find((issue: any) => !successCodes.includes(issue.code))
    // check if the issue codes contain anything other than informational or success
    // if so, it's NOT a successful operationOutcome
    return resource?.resourceType === 'OperationOutcome' && !failureExists
  }
}

// replace what will be redundant in the passthrough url
export const generateRelativePassthroughUrl = (url: string) => url?.replace('/api/fhir', '') as string

// generate error text from HAPI message (if available) else return default
const generateMessageForOpOutcome = (e: any, defaultErr: string) => {
  const errFromOpOutcome = e?.issue?.[0]?.diagnostics?.replace('HAPI-', '')
  return errFromOpOutcome || defaultErr
}

// only allow method and headers in options
interface GetParams {
  method: 'GET',
  options?: {
    headers?: OptionHeaders
  }
}

interface PutParams {
  method: 'PUT',
  options: {
    headers?: OptionHeaders
  }
  body: any
}

interface PostParams {
  method: 'POST',
  options: {
    headers?: OptionHeaders
  }
  body: any
}

interface DeleteParams {
  method: 'DELETE',
  options: {
    headers?: OptionHeaders
  }
  body?: any
}

const isSuccessResponse = (result: any) => (
  // resourceType must exist
  result?.resourceType &&
  // must be NOT an operationOutcome OR a successful operationOutcome
  result.resourceType !== 'OperationOutcome' || is.successfulOpOutcome(result)
)

const allowedHeaders = ['content-type', 'accept', 'cache-control', 'x-meta-snapshot-mode']

const filterHeaders = (headers: IncomingHttpHeaders | null) => {
  if (!headers) {
    return null
  }

  const result = Object.keys(headers).reduce((acc, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      return {
        ...acc,
        [key]: headers[key]
      }
    }
    return acc
  }, {})

  if (Object.keys(result).length === 0) {
    return null
  }
  return result
}

// update params resource based on request method
// limit what people can pass in? eliminate some headers?
const generateParams = (req: NextApiRequest): GetParams | PutParams | PostParams | DeleteParams => {
  const routeMethod = req.method as 'GET' | 'PUT' | 'POST' | 'DELETE'
  const headers = req?.headers || { 'content-type': 'application/json' }
  const filteredHeaders = filterHeaders(headers)

  let requestParams = {
    method: routeMethod,
    ...(Boolean(filteredHeaders) && {
      options: {
        headers: filteredHeaders
      }
    })
  }

  if (routeMethod === 'GET') {
    return requestParams as GetParams
  } else if (
    routeMethod === 'PUT' ||
    routeMethod === 'POST' ||
    (routeMethod === 'DELETE' && req.body)
  ) {

    requestParams = {
      ...requestParams,
      // @ts-ignore
      body: req.body
    }
  }
    // @ts-ignore
    return requestParams
}

const handleErrorOrXmlResponse = (e: any, res: NextApiResponse, genericDefaultError: string) => {
  const status = e?.response?.status || 500
  const data = e?.response?.data
  // if xml response, try/catch might kick it to error block
  // check if this is the case and return cleaned data if so
  if (typeof data === 'string' && (data?.startsWith('<'))) {
    // NOTE: the XML string is escaped at this point because XML does that for certain characters
    // shouldn't change the private/public url strings, though
    const xmlString = e?.response?.data
    return res.status(status).send(xmlString)

  } else {
    // custom operationOutcome error handling?
    const message = generateMessageForOpOutcome(data, genericDefaultError)
    return res.status(status).send(data || generatePassthroughOpOutcome(message))
  }
}

const getPassthroughRequest = async (req: NextApiRequest, res: NextApiResponse) => {

  const requestUrl = generateRelativePassthroughUrl(req.url!)

  try {
    const params = generateParams(req)
    
    const result = await f(FhirCdrClient.getInstance().baseUrl + requestUrl, {
      ...params,
      dispatcher: new Agent({
        connectTimeout: 24 * 60 * 60 * 1000,
        headersTimeout: 24 * 60 * 60 * 1000,
        keepAliveTimeout: 24 * 60 * 60 * 1000,
        keepAliveMaxTimeout: 24 * 60 * 60 * 1000
      }),
     }).then(i => i.json()) as fhir4.Resource

    // opOutcome seems to get kicked to catch anyway...
    if (isSuccessResponse(result)) {
      return res.status(200).send(result)
    } else {
      return res.status(422).send(result)
    }

  } catch (e: any) {
    return handleErrorOrXmlResponse(e, res, 'Could not complete the GET request')
  }
}

const putPassthroughRequest = async (req: NextApiRequest, res: NextApiResponse) => {

  const requestUrl = generateRelativePassthroughUrl(req.url!)

  const [resourceType, resourceId] = requestUrl.split('?')[0].split('/')

  if (!resourceId) {
    const opOutcome = generatePassthroughOpOutcome(
      'Can not update resource, request URL must contain an ID element for update (PUT) operation (it must be of the form [base]/[resource type]/[id])'
    )
    return res.status(422).send(opOutcome)
  }

  try {
    const params = generateParams(req)

    const result = await FhirCdrClient.getInstance().request(
      requestUrl,
      params
    ) as fhir4.Resource

    if (isSuccessResponse(result)) {
      return res.status(200).send(result)
    } else {
      return res.status(422).send(result)
    }

  } catch (e: any) {
    console.log('error in PUT request:', e)
    return handleErrorOrXmlResponse(e, res, 'An error occurred while processing the PUT request')
  }
}

export const MAX_POST_CONTENT_SIZE_BYTES = 5000000

const postPassthroughRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const requestUrl = generateRelativePassthroughUrl(req.url!)

  try {
    const params = generateParams(req)

    const contentLength = Number(req?.headers?.['content-length'] || null)
    const requestTooLarge = contentLength > MAX_POST_CONTENT_SIZE_BYTES

    if (requestTooLarge) {

      // send off request but don't wait for it to finish
      FhirCdrClient.getInstance().request(
        requestUrl,
        params
      )

      return res.status(202).send(generateLargeRequestOpOutcome())
    }
  
    let statusFromServer
    // if request is smaller, wait for it to finish before returning result
    const result = await FhirCdrClient.getInstance().request(
      requestUrl,
      params
    ).then(res => {
      // @ts-ignore
      const httpRes = FhirKitClient.httpFor(res)
      statusFromServer = Number(httpRes?.response.status || null)
      return res
    }) as fhir4.Resource

    if (isSuccessResponse(result)) {
      return res.status(statusFromServer || 200).send(result)
    } else {
      return res.status(statusFromServer || 422).send(result)
    }
  
  } catch (e: any) {
    console.error('Error in POST request:', e)
    return handleErrorOrXmlResponse(e, res, 'An error occurred while processing the POST request')
  }
}

const deletePassthroughRequest = async (req: NextApiRequest, res: NextApiResponse) => {

  const requestUrl = generateRelativePassthroughUrl(req.url!)

  try {
    const params = generateParams(req)

    const result = await FhirCdrClient.getInstance().request(
      requestUrl,
      params
    ) as fhir4.Resource

    if (result?.resourceType && result?.resourceType !== 'OperationOutcome') {
      return res.status(200).send(result)
    
      // checks if operationOutcome is a success/informational type
    } else if (isSuccessResponse(result)) {
      return res.status(200).send(result)
    } else {
      return res.status(422).send(result)
    }

  } catch (e: any) {
    return handleErrorOrXmlResponse(e, res, 'An error occurred while processing the DELETE request')
  }
}

// disable response limit for this route, as some fhir responses (i.e. /fhir/ValueSet) quickly exceed the default limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
}

// overall role-based protections to route methods are not specific enough for some (e.g., posting a bundle of deletes)
export default handler({
  GET: { action: getPassthroughRequest, access: ['admin'] },
  PUT: { action: putPassthroughRequest, access: ['admin'] },
  POST: { action: postPassthroughRequest, access: ['admin'] },
  DELETE: { action: deletePassthroughRequest, access: ['admin'] },
})
