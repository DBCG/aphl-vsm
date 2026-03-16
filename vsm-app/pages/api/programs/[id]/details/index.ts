import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { splitCanonical } from '@/helpers/stringHelpers'
import { SearchParams } from 'fhir-kit-client'
import { fetchGrouperValueSets } from '@/helpers/server/serverValueSetHelper'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import { setVSConditions, setVSPriority } from '@/helpers/libraryHelpers'
export type programDetailsEndpointReturn =
  | {
      valueSets: {
        id?: string
        name?: string
        title?: string
        url?: string
        version?: string
      }[]
      grouperLibrary: fhir4.Library
    }
  | { error: string }
const getProgramDetails = async (req: NextApiRequest, res: NextApiResponse<programDetailsEndpointReturn>): Promise<void> => {
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

    const grouperLibrary = await FhirClient.getInstance()
      .search({
        resourceType: 'Library',
        searchParams
      })
      .then((res) => res as fhir4.Bundle)
      .then((res) => {
        const resource = res?.entry?.[0]?.resource
        return resource
    })
    if (is.library(grouperLibrary)) {
      const grouperUrls = grouperLibrary?.relatedArtifact?.map((i) => i?.resource)?.filter((i) => !!i) as string[]
      const grouperValueSets = await fetchGrouperValueSets({ canonicals: grouperUrls })
        .then((bundles) =>
          bundles
            .map((bundle) => bundle?.entry?.[0]?.resource as fhir4.ValueSet)
            // sometimes the groupers aren't owned
            .filter(res => !!res)
        )
      const formattedValueSets = grouperValueSets?.map((vs) => ({
        id: vs.id,
        name: vs.name,
        title: vs.title,
        url: vs.url,
        version: vs.version
      }))

      res.status(200).send({
        valueSets: formattedValueSets,
        grouperLibrary
      })
    } else {
      throw new Error('returned resource was not Library')
    }
  } catch (e: any) {
    Logger.getLogger().error(`error in programs/programId/details:  ${e}`)
    res.status(400).json({ error: 'Search for grouper libraries failed.' })
  }
}

const updateProgramDetails = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const body = await req.body
  const { grouperIds, conditions, priority, programId, vsUrl } = body
  try {
    let program = (await FhirClient.getInstance().read({ resourceType: 'Library', id: programId })) as fhir4.Library

    // TODO: We should clean this up since grouperIds will always be a single grouper id,
    // we have another endpoint for batch processing so unecessary to have this here.
    const groupers = await Promise.allSettled(
      grouperIds.map((id: string) => FhirClient.getInstance().read({ resourceType: 'ValueSet', id })) as fhir4.ValueSet[]
    )
    // @ts-ignore
    groupers.map(i => i.value).forEach((grouper: fhir4.ValueSet) => {
      let vsUrlToSet = vsUrl
      // We need to check grouper canonicals for the version since that is where they are stored
      const valuesetUrl = grouper?.compose?.include.find((i) => i.valueSet?.[0]?.split('|')?.[0] === vsUrl)?.valueSet?.[0]

      if (valuesetUrl) {
        vsUrlToSet = valuesetUrl
      }
      if (conditions != null) {
        program = setVSConditions(program, conditions, [vsUrlToSet], 'override')
      } else if (priority != null) {
        program = setVSPriority(program, priority, [vsUrlToSet])
      }
    })

    const updatedProgram = await FhirClient.getInstance().update({ resourceType: 'Library', id: programId, body: program })
    return res.status(200).send(updatedProgram)
  } catch (e) {
    const error = e instanceof Error ? e.stack : JSON.stringify(e)
    Logger.getLogger().error(`error in PUT programs/programId/details:  \n${error}`)
    res.status(400).json({ error: 'Update of program details failed.' })
  }
}

export default handler({
  GET: { action: getProgramDetails },
  PUT: { action: updateProgramDetails, access: ['admin', 'publisher', 'editor'] }
})
