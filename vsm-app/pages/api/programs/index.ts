import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import appCache from 'cache'
import { is } from '@/helpers/is'
import logger from '@/helpers/server/logger'
import { HapiError } from '@/types/hapiError'

interface Query {
  '_id:contains'?: string
  'name:contains'?: string
  'description:contains'?: string
  'title:contains'?: string
}
export type ProgramApiResponse = {
  programs: fhir4.Library[]
  assessments: fhir4.Basic[]
} | { error: string }
const getPrograms = async (req: NextApiRequest, res: NextApiResponse<ProgramApiResponse>) => {
  const cache = appCache?.getInstance()
  try {
    // should program status only be draft here? or also active?
    let queries: Query = {}
    // partial match doesn't work on ID, maybe because isn't a string
    if (req.query['id']) {
      const programKey = `Library/${req.query['id']}`

      if (cache?.status === 'ready') {
        const program = await cache?.get(programKey)
        if (program) {
          logger.debug(`cache hit for ${programKey}`)
          //TODO: shoudln't be in this array, need to fixup the apis
          return res.status(200).json({ programs: [JSON.parse(program)], assessments: [] })
        }
      }
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

    const test = await fhirCdrClient.operation({
      name: '$package',
      resourceType: 'Library',
      id: req.query.id as string,
      method: 'PUT',
      input: {}
    })

    const searchResult = await fhirCdrClient.search({
      resourceType: 'Library',
      options: {
        headers: {
          'Cache-control': 'no-cache, no-store, must-revalidate'
        }
      },
      searchParams: {
        context: 'program',
        _sort: ['-_lastUpdated'],
        _revinclude: 'Basic:artifact',
        ...queries
      }
    }) as fhir4.Bundle
    if (searchResult.entry) {
      const resources = searchResult?.entry?.map((e) => e?.resource)
      const programs = resources?.filter(is.library)
      const assessments = resources?.filter(is.basic)

      // Cache the results
      programs.forEach((program: fhir4.Library) => program.id && cache?.set(`Library/${program.id}`, JSON.stringify(program)))

      res.status(200).send({ programs, assessments })
    } else {
      logger.error(searchResult)
      res.status(404).send({ programs: [], assessments: [] })
    }
  } catch (e: any) {
    const error = e as HapiError
    logger.error('ERROR: ' + error.response?.data?.issue?.[0]?.code + ":" + error.response?.data?.issue?.[0]?.diagnostics)
    res.status(400).json({ error: 'Search for program failed.' })
  }
}

export default handler({
  GET: {
    action: getPrograms
  }
})
