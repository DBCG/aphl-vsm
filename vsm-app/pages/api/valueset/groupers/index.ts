// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '../../../../fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    try {
      // e.g. rctc
      const grouperLibrary = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          url: req.query.url
        }
      })

      const grouperUrls = grouperLibrary?.entry?.[0]?.resource?.relatedArtifact?.map((i: any) => i?.resource)

      let grouperValueSets = []

      for (const url of grouperUrls) {

        const grouperVS = await fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: url
          }
        })
        const resource = grouperVS?.entry?.[0]?.resource
        if (resource) {
          grouperValueSets.push(resource)
        }
      }

      const formattedValueSets = grouperValueSets.map(vs => ({
        id: vs.id,
        name: vs.name,
        title: vs.title,
        url: vs.url
      }))

      res.status(200).send(formattedValueSets)


    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for grouper libraries failed.' })
    }
  }
}
