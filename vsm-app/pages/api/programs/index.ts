import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { is } from '@/helpers/is'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

interface Query {
  '_id:contains'?: string
  'name:contains'?: string
  'description:contains'?: string
  'title:contains'?: string
  'version'?: string
  '_offset'?: string
  '_count'?: string
}

export type ProgramApiResponse = {
  programs: fhir4.Library[]
  assessments: fhir4.Basic[]
} | { error: string }

const getPrograms = async (req: NextApiRequest, res: NextApiResponse<ProgramApiResponse | {}>) => {
  try {
    let queries: Query = {}
    // partial match doesn't work on ID, maybe because isn't a string
    if (req.query['id']) {
      queries['_id:contains'] = req.query['id'] as string
    }
    if (req.query['name']) {
      queries['name:contains'] = req.query['name'] as string
    }
    if (req.query['description']) {
      queries['description:contains'] = req.query['description'] as string
    }
    if (req.query['title']) {
      queries['title:contains'] = req.query['title'] as string
    }
    if (req.query['version']) {
      queries['version'] = req.query['version'] as string
    }
    if (req.query['offset']) {
      queries['_offset'] = req.query['offset'] as string
    }
    if (req.query['count']) {
      queries['_count'] = req.query['count'] as string
    }

    const libSearchResult = await fhirCdrClient.search({
      resourceType: 'Library',
      options: {
        headers: {
          'Cache-control': 'no-cache, no-store, must-revalidate'
        }
      },
      searchParams: {
        context: 'program',
        _sort: ['-_lastUpdated'],
        _total: 'accurate',
        ...queries
      }
    }) as fhir4.Bundle

    const asstSearchResult = await fhirCdrClient.search({
      resourceType: 'Basic',
      options: {
        headers: {
          'Cache-control': 'no-cache, no-store, must-revalidate'
        }
      }
    }) as fhir4.Bundle

    if (libSearchResult.entry) {
      const libResources = libSearchResult?.entry?.map((e) => e?.resource)
      const asstResources = asstSearchResult?.entry?.map((e) => e?.resource)
      const programs = libResources?.filter(is.library)
      let assessments = asstResources?.filter(is.basic)
      if(req.query['id']) {
        assessments = assessments
          ?.filter(
            a => a?.extension?.find((ext) => (
              ext?.url?.endsWith('/crmi-artifactAssessmentArtifact')
              && ext?.valueReference?.reference?.split('/')?.[1] === req.query['id']
            ))
          ) || []
      }
      return res.status(200).send({ programs, total: libSearchResult?.total, assessments })
    } else {
      // do not error out if version doesn't exist, it's just not found
      if (req.query.version) {
        return res.status(204).send({})
      } else {
        logger.error(libSearchResult)
        return res.status(404).send({ programs: [], assessments: [] })
      }
    }
  } catch (e: any) {
    logSimpleError(e)
    res.status(400).json({ error: 'Search for program failed.' })
  }
}

export default handler({
  GET: {
    action: getPrograms
  }
})
