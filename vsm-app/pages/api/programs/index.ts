import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { is } from '@/helpers/is'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { getProvisionals } from '../valueset/provisional'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { merge } from 'lodash'

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

interface ProvisionalVsCsMap {
  provisionalLeafId: string
  provisionalLeafUrl: string
  provisionalData: fhir4.ValueSetComposeInclude
}

const getAllValueSetsReferencingProvisionalCS = async (): Promise<ProvisionalVsCsMap[]> => {

  const provisionalVS = await fhirCdrClient.search({
    resourceType: 'ValueSet',
    searchParams: {
      _tag: 'vsm-provisional'
    }
  })

  // early return if no provisional VS
  if (!provisionalVS.entry.length) {
    return ([])
  } else {
    // format provisional valuesets with important data
    const formattedProvisionalInfo = provisionalVS.entry.map(vs => {
      const { id, url } = vs.resource
      const provisionalData = vs.resource.compose.include.filter(x => x.version === 'PROVISIONAL')
      return ({
        provisionalLeafId: id,
        provisionalLeafUrl: url,
        provisionalData
      })
    })

    return formattedProvisionalInfo
  }
}

const getGroupersOwningProvisionals = (provisionalData: ProvisionalVsCsMap) => {

}

const getAllPrograms = async (): Promise<fhir4.Library[]> => {
  const progs = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams: {
      context: 'program',
      _count: 100
    }
  })

  if (!progs.entry) {
    return []
  } else {
    return progs.entry.map(e => e.resource)
  }
}

const getProvisionalValueSetData = async () => {
  // get all programs
  // get provisional info
  const provisionalVsAndCsData = await getAllValueSetsReferencingProvisionalCS()
  // get all programs
  const programs = await getAllPrograms()
  // get groupers that provisionals belong to
  if (!programs?.length) {
    return ({ error: 'No programs found' })
  }

  let grouperValueSetsContainingProvisionalsByProgram = {}
  const test = {
    programId: {
      grouperId: {
        provisionalLeafData: []
      }
    }
  }
  // iterate over each program
  for await (const programLib of programs) {
    const grouperLibCanonical = getGrouperLibraryCanonical(programLib)
    const [url, version] = grouperLibCanonical?.split('|') as [string, string]
    const grouperLib = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        _url: url,
        version
      }
    })
    // get grouper vset info + leaf contents
    const grouperVsetInfo = grouperLib.entry.map(e => ({
      id: e.resource.id,
      url: e.resource.url,
      version: e.resource.version,
      valueSets: e?.resource?.compose?.include?.map(i => i?.valueSet)?.flat() || []
    })) 

    // for each provisional valueset
    provisionalVsAndCsData.forEach(provisionalItem => {
      // if any grouper contains the valueset
      grouperVsetInfo.forEach(grouperItem => {
        if (grouperItem.valueSets.includes(provisionalItem.provisionalLeafUrl)) {
          const existingValues = grouperValueSetsContainingProvisionalsByProgram?.[programLib.id!]?.[grouperItem.id!]?.provisionalLeafData || []
          const itemsToAdd = existingValues.concat(provisionalItem)?.filter(x => x)
          const item = {
            [programLib.id!]: {
              [grouperItem.id!]: {
                provisionalLeafData: itemsToAdd
              }
          }}
          if (itemsToAdd.length) {
            merge(grouperValueSetsContainingProvisionalsByProgram, item)
          }
        }
      })
    })
  }

  return grouperValueSetsContainingProvisionalsByProgram
}

const getProgramLibraries = async (queries={}) => {

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
      _count: 120,
      ...queries
    }
  }) as fhir4.Bundle

  return libSearchResult
}

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
    

    const libSearchResult = await getProgramLibraries(queries) as fhir4.Bundle

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
