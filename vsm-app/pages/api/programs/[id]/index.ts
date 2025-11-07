import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import updateOwnedResources from '@/helpers/server/owned'

// this only gets the program library
const retrieveProgramLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
  if (is.string(req?.query?.id)) {
    try {
      const program = (await FhirClient.getInstance().read({
        resourceType: 'Library',
        id: req.query.id as string
      })) as fhir4.Library

      const asstSearchResult = await FhirClient.getInstance().search({
        resourceType: 'Basic',
        options: {
          headers: {
            'Cache-control': 'no-cache, no-store, must-revalidate'
          }
        },
        searchParams: {
          artifact: req.query['id'] as string
        }
      }) as fhir4.Bundle
      
      const assessments = asstSearchResult?.entry?.map((e) => e?.resource).filter(is.basic)

      return res.status(200).send({program, assessments})
    } catch (e: any) {
      const error = e as HapiError
      Logger.getLogger().error(`ERROR: ${error.response?.data?.issue?.[0]?.code}, ${error.response?.data?.issue?.[0]?.diagnostics}`)
      return res.status(error.response?.status || 400).json({ error: 'Search for program by id failed.' })
    }
  } else {
    Logger.getLogger().error('error: Invalid program ID')
    return res.status(400).json({ error: 'Search for program by id failed.' })
  }
}

const updateProgramLibrary = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | fhir4.Resource | { error: string }>) => {
  try {
    // if the user does not want to change the id of the FHIR Library
    // simply update the values in the existing resource
    const { id, status, experimental, version } = req.body
    if (status === 'active') {
      Logger.getLogger().error('Cannot edit an active Program Library')
      return res.status(409).send({ error: 'Not allowed' })
    }

    // if experimental status was updated, you need to update it on all owned resources
    if (experimental !== req.query['experimental']?.toString()) {
      // update owned resources if experimental value doesn't match
      const experimentalValue = req.query.experimental || experimental || false
      // update in body for separate PUT because library may have other changes to metadata
      req.body.experimental = experimentalValue

      // update experimental on children resources first, do library if successful
      const ownedUpdate = await updateOwnedResources({programId: req.query.id as string, programVersion: version, isExperimental: experimentalValue })

      if (ownedUpdate.error) {
        return res.status(500).json({ error: ownedUpdate.error })
      }
    }

    if (id === req.query['id']?.toString()) {
      const response = await FhirClient.getInstance().update({
        resourceType: 'Library',
        id: id as string,
        body: req.body
      })

      return res.status(200).send(response) // UI is expecting the updated library as a response
    }

  } catch (e: any) {
    const error = e as HapiError
    logSimpleError(error)
    return res.status(error?.response?.status || 500).json({ error: `Error changing ID` })
  }
}

export default handler({
  GET: { action: retrieveProgramLibrary },
  PUT: { action: updateProgramLibrary, access: ['admin', 'editor'] },
})
