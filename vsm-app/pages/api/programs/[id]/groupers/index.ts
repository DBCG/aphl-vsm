// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { removeValueSetFromGrouper } from '@/helpers/valueSetHelpers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  if (req.method === 'PUT') {
    try {
      const body = JSON.parse(req.body)
      const { vsCanonical, grouperCanonicals } = body

      const groupersToUpdate = []
      for (const grouperC of grouperCanonicals) {
        const grouperValueSetBundle = await fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: grouperC
          }
        }) as fhir4.Bundle

        // there is an issue in the sample data where grouper valuesets have the exact same url
        const grouperVsToUpdate = grouperValueSetBundle?.entry?.[0]?.resource as fhir4.ValueSet

        if (grouperVsToUpdate) {
          const updatedGrouper = removeValueSetFromGrouper(grouperVsToUpdate, vsCanonical)

          groupersToUpdate.push(updatedGrouper)
          const result = await Promise.all(groupersToUpdate.map(grouperVs => (
            fhirCdrClient.update({
              resourceType: 'ValueSet',
              id: grouperVs.id,
              body: grouperVs
            })
          )))
        }
      }
      res.status(200).send(groupersToUpdate)
      return

    } catch (e) {
      console.error('error caught in /groupers: ', e)
    }
  }

  res.status(404).send({ error: 'deleted valuesets from grouper did not complete' })
}