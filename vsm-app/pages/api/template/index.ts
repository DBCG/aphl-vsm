import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { generateErrorMessage } from '@/helpers/server/generateErrorMessage'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'

// this code ingests a FHIR Library, and will POST a modified clone as a template
const setDraft = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  try {
    let body = JSON.parse(req.body)

    // date should maybe be passed in from FE
    // since it should map to FE activity?
    const date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDay()

    const parameter = [
      {
        name: 'version',
        version: `${year}-${month}-${day}`
      }
    ]

    const parameters = {
      resourceType: 'Parameters',
      parameter
    } as fhir4.Parameters

    const response = await fhirCdrClient.operation({
      name: '$draft',
      method: 'POST',
      id: `Library/${body.id}`,
      options: {
        headers: {
          'content-type': 'application/json'
        }
      },
      input: JSON.stringify(parameters)
    })

    if (response.ok) {
      return res.send(response)
    } else {
      const json = await response.json()

      const errorMessage = generateErrorMessage({
        serverResponse: json,
        defaultErrorMessage: `Could not clone Library ${body.id}`
      })
      return res.status(response.status).json({ message: errorMessage })
    }
  } catch (e: any) {
    logger.error(e)
    return res.status(400).json({ message: 'Creation of new Library failed.' })
  }
}

export default handler({
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
})
