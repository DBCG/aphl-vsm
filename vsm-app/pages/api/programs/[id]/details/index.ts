// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { splitCanonical } from '@/helpers/splitCanonical'
import { SearchParams } from 'fhir-kit-client'
import { getExpansionParametersSystemVersion } from '@/helpers/valueSetHelpers'
import { fetchGrouperValueSets } from '@/helpers/server/serverValueSetHelper'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'GET') {
    try {
      // e.g. rctc
      const [url, version] = splitCanonical(req.query.url as string)

      let searchParams = {
        url
      } as SearchParams

      // tag on version if it exists in the url
      if (version) {
        searchParams.version = version
      } else {
        // if the version doesn't exist in the URL,
        // the grouper library is in draft
        searchParams.status = 'draft'
      }

      const grouperLibrary = await fhirCdrClient
        .search({
          resourceType: 'Library',
          searchParams
        })
        .then((res) => res?.entry?.[0]?.resource)

      const grouperUrls = grouperLibrary?.relatedArtifact?.map((i: any) => i?.resource)

      const grouperValueSets = await fetchGrouperValueSets(grouperUrls).then((bundles) =>
        bundles.map((bundle) => bundle.entry?.[0]?.resource as fhir4.ValueSet)
      )

      const formattedValueSets = grouperValueSets?.map((vs) => ({
        id: vs.id,
        name: vs.name,
        title: vs.title,
        url: vs.url,
        version: vs.version
      }))
      const expansionParameters = getExpansionParametersSystemVersion(grouperLibrary)

      res.status(200).send({
        grouperLibId: grouperLibrary.id,
        valueSets: formattedValueSets,
        expansionParameters
      })
    } catch (e: any) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for grouper libraries failed.' })
    }
  }
}
