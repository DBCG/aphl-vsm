import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import appCache from 'cache'
import { fhirCdrClient } from 'fhirClients'
import { error } from '@/types/fhirClient'

// this sets approvalDate and date and optionally
// creates an artifactCommentExtension
const approve = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | { error: string }>): Promise<void> => {
  const cache = appCache?.getInstance()
  if (req.method === 'POST') {
    try {
      const response = (await fhirCdrClient.operation({
        name: '$approve',
        resourceType: 'Library',
        id: req.query.id as string,
        method: 'POST',
        input: req.body
      })) as fhir4.Library
      res.send(response)
    } catch (e: any) {
      const error = e as error
      console.error('ERROR: ', error.response?.data?.issue?.[0]?.code, error.response?.data?.issue?.[0]?.diagnostics)
      res.status(error.response?.status).json({ error: error.response?.data?.issue?.[0]?.diagnostics || 'unknown' })
    }
  } else {
    console.error('GET is not defined for this operation')
    res.status(400).json({ error: 'unknown' })
  }
}

export default handler({
  POST: {
    action: approve,
    access: ['admin']
  }
})
