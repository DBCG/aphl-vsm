// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { splitCanonical } from '@/helpers/splitCanonical'
import { SearchParams } from 'fhir-kit-client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  if (req.method === 'GET') {
    try {
      // e.g. rctc
      const [url, version] = splitCanonical(req.query.url as string)

      let searchParams = {
        url,
      } as SearchParams

      // tag on version if it exists in the url
      if (version) {
        searchParams.version = version
      }

      const grouperLibrary = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams
      })

      const grouperUrls = grouperLibrary
        ?.entry?.[0]
        ?.resource
        ?.relatedArtifact
        ?.map((i: any) => i?.resource)

      let grouperValueSets = []

      for (const canonical of grouperUrls) {
        const [url, version] = splitCanonical(canonical)

        let searchParams = {
          url
        } as SearchParams

        // tag on version if exists in the grouper
        // TODO: probably should not change this
        if (version) {
          searchParams.version = version
        }

        const grouperVS = await fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams
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
