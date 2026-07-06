import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'
import sanitizeExport from '@/helpers/sanitizeExportHelper'
import { QUEUE_OPTIONS } from '@/config'
import Cache from '@/cache'
import { JOB_STATUS } from '@/constants'
import { Agent, fetch as f } from 'undici'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import Queue from 'bull'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
import { convertBundleToCSVHelper } from '@/helpers/convertBundleToCSVHelper'

const PackageQueue = new Queue('exportProgram', QUEUE_OPTIONS)

const validatePackage = async (pkgBundle: fhir4.Bundle | string) => {
  let parameters: string
  // string means XML
  if (typeof pkgBundle === 'string') {
    parameters = `<Parameters xmlns='http://hl7.org/fhir'>
                    <parameter>
                      <name value='resource'/>
                      <resource>
                          ${pkgBundle}
                      </resource>
                    </parameter>
                  </Parameters>`
  } else {
    const validateParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'resource',
          resource: pkgBundle
        }
      ]
    }
    parameters = JSON.stringify(validateParameters)
  }
  const validateResponse = (await f(FhirClient.getInstance().baseUrl + '/$validate', {
    method: 'POST',
    body: parameters,
    dispatcher: new Agent({
      connectTimeout: 24 * 60 * 60 * 1000,
      headersTimeout: 24 * 60 * 60 * 1000,
      keepAliveTimeout: 24 * 60 * 60 * 1000,
      keepAliveMaxTimeout: 24 * 60 * 60 * 1000
    }),
    // @ts-ignore
    headers: {
      'Content-Type': `application/fhir+${typeof pkgBundle === 'string' ? 'xml' : 'json'}`,
      ...FhirClient.getInstance().customHeaders
    }
  }).then((response) => {
    if (typeof pkgBundle === 'string') {
      return response.text()
    } else {
      return response.json()
    }
  })) as fhir4.OperationOutcome | string

  const nonBreakingErrors = formatErrors(validateResponse, 'Unknown error performing validation')

  // validation failure does not break the workflow in the app
  return (
    nonBreakingErrors?.map((e) => `Location: ${e.location?.join(' ') || '[Unknown Location]'}: \n${e.diagnostics || '[Unknown Issue]'}`) ||
    []
  )
}

PackageQueue.process(async function (job: any, done) {
  Logger.getLogger().info('Begin Export Operation Job')
  const { data, programId, userId, convertToCSV } = job.data
  job.progress(1)
  const parameters = await addTerminologyEndpointToParameters({parameters: data?.parameters, userId})

  // conversion to CSV happens at the end of processing,
  // use JSON for the actual work until the end, then convert the JSON to CSV
  const userDesiredFormat = data?.json || convertToCSV ? 'json' : 'xml'
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`
  try {
    Logger.getLogger().info('Exporting program: ' + programId)
    const url = `${FhirClient.getInstance().baseUrl}/Library/${programId as string}/$package?_format=${userDesiredFormat}`
    let initialResponse
    try {
      initialResponse = await f(url, {
        body: JSON.stringify(parameters),
        method: 'POST',
        dispatcher: new Agent({
          connectTimeout: 24 * 60 * 60 * 1000,
          headersTimeout: 24 * 60 * 60 * 1000,
          keepAliveTimeout: 24 * 60 * 60 * 1000,
          keepAliveMaxTimeout: 24 * 60 * 60 * 1000
        }),
        // @ts-ignore
        headers: {
          'Content-Type': 'application/fhir+json',
          'Prefer': 'respond-async',
          ...FhirClient.getInstance().customHeaders
        }
      })
    } catch (err: any) {
      Logger.getLogger().error('Export error details:')
      Logger.getLogger().error(`Message: ${err?.message}`)
      Logger.getLogger().error(`Name: ${err?.name}`)
      Logger.getLogger().error(err?.stack)
      logSimpleError(err)
      throw 'cause' in err ? err.cause : err
    }

    let response: fhir4.Bundle | fhir4.OperationOutcome | string
    if (initialResponse.status === 202) {
      const statusUrl = initialResponse.headers.get('Content-Location')
      if (!statusUrl) {
        throw new Error('Server returned 202 but no Content-Location header for async polling')
      }
      Logger.getLogger().info(`Async $package accepted, polling status at: ${statusUrl}`)
      response = await pollAsyncPackage(statusUrl, userDesiredFormat)
    } else if (initialResponse.ok) {
      if (userDesiredFormat === 'json') {
        try {
          response = (await initialResponse.json()) as fhir4.Bundle | fhir4.OperationOutcome
        } catch (e) {
          response = await initialResponse.text()
        }
      } else {
        response = await initialResponse.text()
      }
    } else {
      throw new Error(`HTTP error: ${initialResponse.status} ${initialResponse.statusText}`)
    }
    if (
      (typeof response !== 'string' && response.resourceType === 'OperationOutcome') ||
      (typeof response === 'string' && response.startsWith('<OperationOutcome'))
    ) {
      const errors = formatErrors(response, 'Error while performing $package')
        .map((e) => e.diagnostics!)
        .join(', ')
      Logger.getLogger().error(errors)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errors)
      return done(null, { error: errors })
    }
    job.progress(90)
    const sanitizedExport = sanitizeExport(response)
    Logger.getLogger().info('Validating package')
    const validationResults = await validatePackage(sanitizedExport)
    Logger.getLogger().info('Finished Validation, returning results')
    job.progress(100)
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)

    if (convertToCSV) {
      Logger.getLogger().info('Converting package to CSV format')
      const csvExport = convertBundleToCSVHelper(sanitizedExport)
      return done(null, { response: {formatType: 'csv', data: csvExport}, validationResults })
    } else {
      return done(null, { response: {formatType: userDesiredFormat, data: sanitizeExport(sanitizedExport) }, validationResults })
    } 
  } catch (error: any) {
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    const errorMsg = diagnostics || error?.error || error.toString() || 'Unspecified error'
    Logger.getLogger().error(errorMsg)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
    return done(null, { error: errorMsg })
  }
})

const ASYNC_POLL_INTERVAL_MS = 10000
const ASYNC_MAX_POLL_ATTEMPTS = 720 // 2 hours at 10s intervals

const pollAsyncPackage = async (statusUrl: string, format: string): Promise<fhir4.Bundle | fhir4.OperationOutcome | string> => {
  for (let attempt = 0; attempt < ASYNC_MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, ASYNC_POLL_INTERVAL_MS))

    const pollResponse = await f(statusUrl, {
      method: 'GET',
      dispatcher: new Agent({
        connectTimeout: 24 * 60 * 60 * 1000,
        headersTimeout: 24 * 60 * 60 * 1000,
        keepAliveTimeout: 24 * 60 * 60 * 1000,
        keepAliveMaxTimeout: 24 * 60 * 60 * 1000
      }),
      headers: { ...FhirClient.getInstance().customHeaders }
    })

    if (pollResponse.status === 200) {
      Logger.getLogger().info('Async $package operation complete')
      if (format === 'json') {
        try {
          return (await pollResponse.json()) as fhir4.Bundle | fhir4.OperationOutcome
        } catch (e) {
          return await pollResponse.text()
        }
      } else {
        return await pollResponse.text()
      }
    } else if (pollResponse.status === 202) {
      const progress = pollResponse.headers.get('X-Progress')
      Logger.getLogger().info(`Async $package still processing${progress ? ': ' + progress : ''}`)
    } else {
      const errorText = await pollResponse.text()
      throw new Error(`Async $package poll failed with status ${pollResponse.status}: ${errorText}`)
    }
  }

  throw new Error('Async $package operation timed out after maximum poll attempts')
}

export default PackageQueue
