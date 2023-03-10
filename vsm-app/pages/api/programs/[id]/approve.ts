import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import appCache from 'cache'
import { fhirCdrClient } from 'fhirClients'

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
    } catch (error: any) {
      const outcome = error.response.data as fhir4.OperationOutcome
      console.error('error with $approve operation', outcome?.issue?.[0]?.code, outcome?.issue?.[0]?.diagnostics)
      res.status(400).json({ error: outcome?.issue?.[0]?.diagnostics || 'unknown' })
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
