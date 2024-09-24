// dev endpoint to get + update leaf valuesets in the system with proper auth source

import { fhirCdrClient } from '@/fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { addExtensionToVs, EXTENSIONS } from '@/helpers/valueSetHelpers'
import type { NextApiRequest, NextApiResponse } from 'next'

// this update works via url so that it can catch multiple versions of valuesets if necessary
const updateLeafsWithVSACAuthSource = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const urlsToUpdate = req.body
    
    // GET the valuesets to update.
    // Search by URL because possible there are multiple versions of the same VS
    const allVsetsForUpdate = urlsToUpdate.map((url: fhir4.ValueSet['url']) => ({
      resourceType: 'ValueSet',
      request: {
        method: 'GET',
        url: `ValueSet?url=${url}`
      }
    }))

    const response = await fhirCdrClient.batch({ body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: allVsetsForUpdate
    }})

    const valueSets = response?.entry?.map(vsBundle => {
        return vsBundle?.resource?.entry
      })
      ?.flat()
      ?.filter(x => !!x)
      ?.map(x => x.resource) || []

    // check if some items weren't found for update
    // to report data back to the client
    const itemsNotFound = urlsToUpdate.filter((url: string) => !valueSets.find((vs: fhir4.ValueSet) => vs.url === url)) || []

    // if no items were found
    if (!valueSets.length && itemsNotFound.length) {
      const errMsg = `No ValueSets found with URLs: ${itemsNotFound.join(', ')}` 
      console.log('errMsg', errMsg)
      return res.status(404).json({ error: errMsg })
    }

    // update the auth source for each value set
    const updatedValueSets = valueSets.map((vs: fhir4.ValueSet) => {
      const newUri = vs.url?.replace('http://', 'https://')

      const updatedVs = addExtensionToVs(vs, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, newUri as string)
      return updatedVs
    })

    const vsBatchToUpdate = updatedValueSets.map((updatedVs: fhir4.ValueSet) => ({
      resource: updatedVs,
      request: {
        method: 'PUT',
        url: `ValueSet/${updatedVs.id}`
      }
    }))

    // batch instead of transaction because we want to update multiple resources
    // even if one has an error, we'll return that info to the client
    const updateResponse = await fhirCdrClient.batch({ body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: vsBatchToUpdate
    }})

    interface UpdateData {
      urlsNotFound: string[]
      successfulUpdateInfo: string[]
      failedUpdateInfo: string[]
    }
  
    const updateInfo: UpdateData = {
      urlsNotFound: itemsNotFound,
      successfulUpdateInfo: [],
      failedUpdateInfo: [],
    }

    updateResponse?.entry?.forEach((i: any) => {
      if (i?.response?.status?.includes('200')) {
        console.log('i', i.response?.outcome?.issue)
        const successDiagnosticsInfo = i?.response?.outcome?.issue?.map(issue => issue?.diagnostics) || [] as string[]
        updateInfo.successfulUpdateInfo = [...updateInfo.successfulUpdateInfo, ...successDiagnosticsInfo]
      } else {
        const errorDiagnosticsInfo = i?.response?.outcome?.issue?.map(issue => issue?.diagnostics) || [] as string[]
        updateInfo.failedUpdateInfo = [...updateInfo.failedUpdateInfo, ...errorDiagnosticsInfo]
      }
    })

    // if any were successful, 200 status
    if (updateInfo.successfulUpdateInfo.length) {
      return res.status(200).json(updateInfo)
    } else {
      // if no successful updates, return 400 status
      return res.status(400).json(updateInfo)
    }

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Updating ValueSets with VSAC auth src failed' })
  }
}

export default handler({
  PUT: { action: updateLeafsWithVSACAuthSource, access: ['admin'] }
})