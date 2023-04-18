import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { generateErrorMessage } from '@/helpers/server/generateErrorMessage'
import logger from '@/helpers/server/logger'

// this code ingests a FHIR Library, and will POST a modified clone as a template
const setDraft = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  try {
    let body = JSON.parse(req.body)

    const postBody = JSON.stringify({
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'specification',
          resource: body
        }
      ]
    })

    const response = await fetch(`${process.env.FHIR_CDR_URL}/Library/${body.id}/$draft`, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: postBody
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
    logger.error('error:  ', e)
    return res.status(400).json({ message: 'Creation of new Library failed.' })
  }
}

export default handler({
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
})
