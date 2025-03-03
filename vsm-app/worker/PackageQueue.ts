import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'
import sanitizeExport from '@/helpers/sanitizeExportHelper'
import { QUEUE_REDIS_URL } from '@/config'
import Cache from '@/cache'
import { JOB_STATUS } from '@/constants'
import { Agent, fetch as f } from 'undici'
import FhirClient from '@/backend/clients/FhirClient'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import Queue from 'bull'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'

const PackageQueue = new Queue('exportProgram', QUEUE_REDIS_URL)

const convertV2toV1 = async (v2: fhir4.Bundle, format: 'json' | 'xml', planDefinition?: fhir4.PlanDefinition, targetVersion?: string) => {
  if (!v2.entry) {
    throw 'Empty bundle returned from server'
  }
  Logger.getLogger().info('Generating v2 to v1 transform for download')

  const planDefResourceIndex = v2.entry.findIndex((e: fhir4.BundleEntry) => e.resource?.resourceType === 'PlanDefinition')
  const planDefFromV2Exist = planDefResourceIndex != null && planDefResourceIndex > -1

  // if planDefinition is provided in the request, and not present then add it to bundle entry
  if (!planDefFromV2Exist && planDefinition != null) {
    v2.entry.push({
      fullUrl: planDefinition?.url,
      resource: planDefinition
    })
    // if planDefinition is provided in the request, use it to replace the one from the v2 package response
  } else if (planDefFromV2Exist && planDefinition != null) {
    v2.entry[planDefResourceIndex].resource = planDefinition
  } else if (!planDefFromV2Exist && planDefinition == null) {
    Logger.getLogger().error('No PlanDefinition resource found in package response nor was uploaded as part of the request')
    throw 'No PlanDefinition resource found in v2 package response nor was uploaded as part of the request'
  }
  const v1BundleBody: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'bundle',
        resource: v2
      }
    ]
  }

  if (targetVersion && targetVersion?.length > 0) {
    v1BundleBody.parameter?.push({
      name: 'targetVersion',
      valueString: targetVersion
    })
  }

  return f(`${FhirClient.getInstance().baseUrl}/$ersd-v2-to-v1-transform?_format=${format}`, {
    body: JSON.stringify(v1BundleBody),
    method: 'POST',
    dispatcher: new Agent({
      connectTimeout: 24 * 60 * 60 * 1000,
      headersTimeout: 24 * 60 * 60 * 1000,
      keepAliveTimeout: 24 * 60 * 60 * 1000,
      keepAliveMaxTimeout: 24 * 60 * 60 * 1000
    }),
    headers: {
      'Content-Type': 'application/fhir+json',
      // should be Basic Auth creds
      ...FhirClient.getInstance().customHeaders
    }
  })
    .then(async (r) => {
      if (format === 'json') {
        try {
          return (await r.json()) as fhir4.Bundle | fhir4.OperationOutcome
        } catch (e) {
          return await r.text()
        }
      } else {
        return await r.text()
      }
    })
    .catch((err) => {
      logSimpleError(err)
      if ('cause' in err) {
        throw err.cause
      } else {
        throw err
      }
    })
}

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
  const validateResponse = (await fetch(FhirClient.getInstance().baseUrl + '/$validate', {
    method: 'POST',
    body: parameters,
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
  const { data, programId, planDefinition, targetVersion, userId } = job.data
  job.progress(1)
  const parameters = addTerminologyEndpointToParameters(data?.parameters)
  const userDesiredFormat = data?.json ? 'json' : 'xml'
  const useV1 = !data?.useV2
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`
  try {
    let currentFormat = useV1 ? 'json' : userDesiredFormat // force json for v1 so we can pass it back to the server to convert to v2
    const url = `${FhirClient.getInstance().baseUrl}/Library/${programId as string}/$ecr.package?_format=${currentFormat}`
    Logger.getLogger().debug(`Exporting program ${programId} with parameters: ${JSON.stringify(parameters)}`)
    let response = await f(url, {
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
        ...FhirClient.getInstance().customHeaders
      }
    })
      .then(async (r) => {
        if (currentFormat === 'json') {
          try {
            return (await r.json()) as fhir4.Bundle | fhir4.OperationOutcome
          } catch (e) {
            return await r.text()
          }
        } else {
          return await r.text()
        }
      })
      .catch((err) => {
        logSimpleError(err)
        if ('cause' in err) {
          throw err.cause
        } else {
          throw err
        }
      })
    if (useV1) {
      if (typeof response === 'string') {
        throw new Error('Got string (XML?) response but expected FHIR JSON')
      }
      if (response.resourceType === 'OperationOutcome') {
        job.progress(100)
        const errorMsg = response?.issue?.map((e) => e?.diagnostics!).join(', ') || 'Error encountered while packaging V1'
        Logger.getLogger().error(errorMsg)
        await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
        return done(null, { error: errorMsg })
      }
      try {
        Logger.getLogger().info('Converting V2 to V1 for export program: ' + programId)
        response = await convertV2toV1(
          response,
          (currentFormat = userDesiredFormat), // reset to actual format for v1
          planDefinition,
          targetVersion
        )
      } catch (error: any) {
        Logger.getLogger().error(error)
        await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
        return done(null, { error })
      }
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
    return done(null, { response: sanitizeExport(sanitizedExport), validationResults })
  } catch (error: any) {
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    const errorMsg = diagnostics || error?.error || error.toString() || 'Unspecified error'
    Logger.getLogger().error(errorMsg)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
    return done(null, { error: errorMsg })
  }
})

export default PackageQueue
