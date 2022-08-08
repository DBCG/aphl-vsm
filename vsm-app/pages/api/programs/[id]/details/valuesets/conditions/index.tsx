// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import { getSession } from 'next-auth/react'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
    const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  if (req.method === 'PUT') {
    const body = JSON.parse(req.body)
    // need to identify by version, too... can do w/ read?
    // ISSUE to be fixed by cache... thihs isn't immediately available
    const valueSetToUpdate = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: body?.canonical,
        version: body?.version
      }
    })

    const vs = valueSetToUpdate?.entry?.[0]?.resource

    const updatedValueSet = updateConditions(vs, body.conditionInfo)

    let updated
    try {
      updated = await fhirCdrClient.update({
        resourceType: 'ValueSet',
        searchParams: {
          url: body?.canonical,
          version: body.version
        },
        body: updatedValueSet
      })
      res.status(200).send(updated)
    } catch (e) {
      console.error('error: ', e)
      res.status(400).send({ error: 'error'})
    }
  }
}
