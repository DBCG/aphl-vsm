import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
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
      res.status(error.response?.status).json({ error: 'Search for program by id failed.' })
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
    if (req.body.status === 'active') {
      logger.error('Cannot edit an active Program Library')
      res.status(405).send({ error: 'Not allowed' })
      return
    }
    if (req.body.id === req.query['id']) {
      const response = await fhirCdrClient.update({
        resourceType: 'Library',
        id: req.body.id as string,
        body: req.body
      })

      return res.status(200).send(response) // UI is expecting the updated library as a response
    } else {
      // if the user wants to change the id of the Library (hence non-matching ids),
      // create a new Library with that name, then delete the original one
      const body = await JSON.parse(req.body)
      await fhirCdrClient
        .update<fhir4.Library>({
          resourceType: 'Library',
          id: body.id as string,
          body: req.body
        })
        .then((newLibraryData) => {
          return fhirCdrClient.delete({
            resourceType: 'Library',
            id: req.query.id as string
          })
        })
        .then((data) => {
          res.send(data)
        })
      return
    }
  } catch (e: any) {
    const error = e as HapiError
    logger.error('ERROR: ', error.response?.data?.issue?.[0]?.code, error.response?.data?.issue?.[0]?.diagnostics)
    res.status(error.response?.status).json({ error: `Error changing ID` })
    return
  }
}

export default handler({
  GET: { action: retrieveProgramLibrary },
  PUT: { action: updateProgramLibrary },
  POST: { action: createProgramLibrary }
})
