// AFter package/export runs, we will initiate this job
// to download VS dependencies into the cache if they do not already exist
// https://alphora.atlassian.net/browse/APHL-1187

import FhirClient from '@/backend/clients/FhirCdrClient'
import { QUEUE_OPTIONS } from '@/config'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import Logger from '@/helpers/server/logger'
import Queue from 'bull'

const VSDownloadQueue = new Queue('vsDownload', QUEUE_OPTIONS)

VSDownloadQueue.process(async function (job: any, done) {
  const { urls, userId } = job.data
  Logger.getLogger().info(`Preparing to cache ValueSet urls: ${urls}`)
  const batchBundleEntry = urls.map((url: string) => {
    return {
      request: {
        method: 'GET',
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
      done(null)
    }
    Logger.getLogger().info(`${urlsToDownload.length} ValueSets to download to cache `)

    const vsacClient = await TerminologyFhirClient.getClient(userId)
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
