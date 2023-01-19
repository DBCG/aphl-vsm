import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import appCache from 'cache'

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string
}

const getPrograms = async (req: NextApiRequest, res: NextApiResponse) => {
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
          console.log(`cache hit for ${programKey}`)
          //TODO: shoudln't be in this array, need to fixup the apis
          return res.status(200).json([JSON.parse(program)])
        }
      }
      queries['_id:contains'] = req.query['id'] as string
    } if (req.query['name']) {
      queries['name:contains'] = req.query['name'] as string
    } if (req.query['description']) {
      queries['description:contains'] = req.query['description'] as string
    } if (req.query['title']) {
      queries['title:contains'] = req.query['title'] as string
    }
    const searchResult = await fhirCdrClient.search({
      resourceType: 'Library',
      options: {
        headers: {
          'Cache-control': 'no-cache, no-store, must-revalidate'
        },
      },
      searchParams: {
        context: 'program',
        _sort: ['-_lastUpdated'],
        ...queries
      }
    })

    if (searchResult.entry) {
      const programs = searchResult?.entry?.map((e: any) => e?.resource)

      // Cache the results
      programs.forEach((program: fhir4.Library) => program.id && cache?.set(`Library/${program.id}`, JSON.stringify(program)))
      //

      res.status(200).send(programs)
    } else {
      console.error(searchResult)
      res.status(404).send([])
    } 
  } catch (e: any) {
    console.error('error programs:  ', e.response.data.text)
    res.status(400).json({ error: 'Search for program failed.' })
  }
}

export default handler({
  GET: {
    action: getPrograms
  }
})