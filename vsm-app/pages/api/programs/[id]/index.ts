import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import logger from '@/helpers/server/logger'

// this only gets the program library
const retrieveProgramLibrary = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | { error: string }>) => {
  if (is.string(req?.query?.id)) {
    try {
      const lib = (await fhirCdrClient.read({
        resourceType: 'Library',
        id: req.query.id as string
      })) as fhir4.Library

      res.status(200).send(lib)
      return
    } catch (e: any) {
      const error = e as HapiError
      logger.error('ERROR: ', error.response?.data?.issue?.[0]?.code, error.response?.data?.issue?.[0]?.diagnostics)
      res.status(error.response?.status || 400).json({ error: 'Search for program by id failed.' })
      return
    }
  } else {
    logger.error('error: Invalid program ID')
    res.status(400).json({ error: 'Search for program by id failed.' })
    return
  }
}

const createProgramLibrary = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | { error: string }>) => {
  try {
    // update the program by id

    const response = (await fhirCdrClient.update<fhir4.Library>({
      resourceType: 'Library',
      id: req.query['id'] as string,
      body: req.body
    })) as fhir4.Library
    res.send(response)
    return
  } catch (e: any) {
    const error = e as HapiError
    logger.error('ERROR: ', error.response?.data?.issue?.[0]?.code, error.response?.data?.issue?.[0]?.diagnostics)
    res.status(error.response?.status).json({ error: `Error updating program by ID` })
    return
  }
}

const updateProgramLibrary = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | fhir4.Resource | { error: string }>) => {
  try {
    // if the user does not want to change the id of the FHIR Library
    // simply update the values in the existing resource
    const { id, status } = JSON.parse(req.body)
    if (status === 'active') {
      logger.error('Cannot edit an active Program Library')
      return res.status(409).send({ error: 'Not allowed' })
    }

    if (id === req.query['id']?.toString()) {
      const response = await fhirCdrClient.update({
        resourceType: 'Library',
        id: id as string,
        body: req.body
      })

      console.log('response: ', response)

      return res.status(200).send(response) // UI is expecting the updated library as a response
    }

  } catch (e: any) {
    const error = e as HapiError
    logger.error('ERROR: ', error.response?.data?.issue?.[0]?.code, error.response?.data?.issue?.[0]?.diagnostics)
    return res.status(error?.response?.status || 500).json({ error: `Error changing ID` })
  }
}

export default handler({
  GET: { action: retrieveProgramLibrary },
  PUT: { action: updateProgramLibrary, access: ['admin', 'editor'] },
  POST: { action: createProgramLibrary, access: ['admin', 'editor'] }
})
