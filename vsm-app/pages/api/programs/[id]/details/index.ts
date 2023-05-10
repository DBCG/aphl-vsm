import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { splitCanonical } from '@/helpers/splitCanonical'
import { SearchParams } from 'fhir-kit-client'
import { getExpansionParametersSystemVersion } from '@/helpers/valueSetHelpers'
import { fetchGrouperValueSets } from '@/helpers/server/serverValueSetHelper'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import { ManifestDataMap } from '@/types/manifestTypes'
export type programDetailsEndpointReturn = {
  valueSets: {
    id?: string
    name?: string
    title?: string
    url?: string
    version?: string
  }[],
  expansionParameters: ManifestDataMap,
  grouperLibrary: fhir4.Library
} | { error: string }
const getProgramDetails = async (req: NextApiRequest, res: NextApiResponse<programDetailsEndpointReturn>): Promise<void> => {
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
        .then((res) => res as fhir4.Bundle)
        .then((res) => res?.entry?.[0]?.resource)
      if (is.library(grouperLibrary)) {
        const grouperUrls = grouperLibrary?.relatedArtifact
          ?.map((i) => i?.resource)
          ?.filter((i) => !!i) as string[]

        const grouperValueSets = await fetchGrouperValueSets({ canonicals: grouperUrls }).then((bundles) =>
          bundles.map((bundle) => bundle?.entry?.[0]?.resource as fhir4.ValueSet)
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
          valueSets: formattedValueSets,
          expansionParameters,
          grouperLibrary
        })
      } else {
        throw new Error("returned resource was not Library")
      }
    } catch (e: any) {
      logger.error('error:  ', e)
      res.status(400).json({ error: 'Search for grouper libraries failed.' })
    }
  }
}

export default handler({
  GET: { action: getProgramDetails }
})
