import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'

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
    }
    
  } catch (e: any) {
    console.error('error:  ', e)
    return res.status(400).json({ error: 'Creation of new library failed.' })
  }

  // if response was NOT ok (not 200 from FHIR server, but did complete)
  console.error('Failure to perform $draft from FHIR server')
  return res.status(422).json({ error: 'Creation of new library failed.' })
}

export default handler({ 
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
})