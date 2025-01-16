// AFter package/export runs, we will initiate this job
// to download VS dependencies into the cache if they do not already exist
// https://alphora.atlassian.net/browse/APHL-1187

import FhirClient from '@/backend/clients/FhirClient'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { QUEUE_REDIS_URL } from '@/config'
import { terminologyClient } from '@/fhirClients'
import Logger from '@/helpers/server/logger'
import Queue from 'bull'

const VSDownloadQueue = new Queue('vsDownload', QUEUE_REDIS_URL)

VSDownloadQueue.process(async function (job: any, done) {
  const { urls, userId } = job.data
  const batchBundleEntry = urls.map((url: string) => {
    return {
      request: {
        method: 'GET',
        resourceType: 'ValueSet',
        url: `ValueSet?url=${url}&_elements=id`
      }
    }
  }) as fhir4.BundleEntry

  const fhirCdrClient = FhirClient.getInstance()

  const urlsToDownload = [] as string[]

  // Check if ValueSets already exist
  try {
    const results = (await fhirCdrClient.batch({
      body: {
        resourceType: 'Bundle',
        type: 'batch',
        entry: batchBundleEntry
      }
    })) as fhir4.Bundle

    results.entry?.forEach((i: fhir4.BundleEntry) => {
      const bundle = i?.resource as fhir4.Bundle
      if (bundle?.total === 0) {
        const url = new URL(bundle?.link?.[0]?.url!)
        urlsToDownload.push(url.searchParams.get('url')!)
      }
    })

    if (urlsToDownload.length === 0) {
      Logger.getLogger().info('No new valuesets to cache.')
      return
    }
    Logger.getLogger().info(`${urlsToDownload.length} ValueSets to download to cache `)

    const vsacClient = terminologyClient.getClient()
    Logger.getLogger().debug(`Getting vsac creds for ${userId}`)
    const creds = await tsCredentialService.getVsacCredentials(userId)

    // @ts-ignore
    vsacClient.customHeaders['Authorization'] = Buffer.from(creds.username + ':' + creds.password).toString('base64')
    //Retrieve Valuesets from VSAC not cached in CQF
    Logger.getLogger().debug('Searching VSAC for ValueSets')
    const vsacResults = (await Promise.all(
      urlsToDownload.map((url) =>
        vsacClient?.search({
          resourceType: 'ValueSet',
          searchParams: { url }
        })
      )
    )) as fhir4.Bundle[]

    Logger.getLogger().debug('Processing VSAC Results')
    const vsToSave = [] as any
    vsacResults.forEach((bundle) => {
      const bundleEntry = bundle.entry as fhir4.BundleEntry[]
      if ((bundle?.total || 0) > 0) {
        const vs = bundleEntry[0]?.resource
        vsToSave.push({
          resource: vs,
          request: {
            method: 'POST',
            resourceType: 'ValueSet'
          }
        })
      } else {
        const extractedUrl = new URL(bundle?.link?.[0]?.url!)
        Logger.getLogger().warn(`Could not find ${extractedUrl.searchParams.get('url')} for VS Download`)
      }
    })
    Logger.getLogger().info(`Preparing to save ${vsToSave.length} ValueSets to cache`)
    const response = (await fhirCdrClient.transaction({
      body: {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: vsToSave
      }
    })) as fhir4.Bundle
    processTransactionResults(response)
    Logger.getLogger().info(`Finished`)

    done(null)
  } catch (error) {
    Logger.getLogger().error(error)
    done(null, { error })
  }
})

const processTransactionResults = (transactionResponse: fhir4.Bundle) => {
  transactionResponse?.entry?.forEach((tx) => {
    const response = tx.response
    if (!response?.status?.includes('201')) {
      Logger.getLogger().error(`Error saving ${response?.location}`)
      Logger.getLogger().error(`${JSON.stringify(response?.outcome)}`)
    }
  })
}

export default VSDownloadQueue
