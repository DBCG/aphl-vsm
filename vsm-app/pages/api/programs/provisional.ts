import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { uniqBy } from 'lodash'
import { getGrouperLibrary, getGrouperValuesets, getLeafUrlsFromGrouper } from './[id]/details/valuesets'
import { fetchLeafValueSets } from '@/helpers/server/serverValueSetHelper'
import { is } from '@/helpers/is'

export type ProgramApiResponse = {
  programs: fhir4.Library[]
  assessments: fhir4.Basic[]
} | { error: string }

interface ProvisionalVsCsMap {
  provisionalLeafId: string
  provisionalLeafUrl: string
  provisionalData: fhir4.ValueSetComposeInclude
}

interface LeafItems {
  id: string
  title: string
  url: string
}

interface DataItem {
  programId: string
  programTitle: string
  provisionalLeafs: LeafItems[]
}

export type ProvisionalsByProgram = DataItem[]

const getAllPrograms = async (): Promise<fhir4.Library[]> => {
  const progs = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams: {
      context: 'program',
      _count: 1000
    }
  })

  if (!progs.entry) {
    return []
  } else {
    return progs.entry.map((e: any) => e.resource as fhir4.Library)
  }
}

const getProvisionalValueSetDataByProgram = async () => {
  // get all programs
  const programs = await getAllPrograms()

  if (!programs?.length) {
    return ({})
  }

  let provisionalLeafsByProgram = [] as ProvisionalsByProgram

  // iterate over each program
  for await (const programLib of programs) {
    const grouperLib = await getGrouperLibrary(programLib)
    const groupers = await getGrouperValuesets(grouperLib as fhir4.Library)

    if (!is.errorItem(groupers)) {
      for await (const grouperVs of groupers) {
        const leafValueSetCanonicals = getLeafUrlsFromGrouper(grouperVs).filter(x => is.string(x)) as string[]
        const provisionalLeafs = await fetchLeafValueSets({ leafValueSetCanonicals, provisionalOnly: true })
        // only add to the structure if the program has provisional leafs
        if (provisionalLeafs && provisionalLeafs.length) {
          const newLeafs = provisionalLeafs.map(l => ({
            id: l.id,
            title: l.title,
            url: l.url
          }))

          const existingProgramIndex = provisionalLeafsByProgram.findIndex(p => p.programId === programLib.id)
          // if program already exists, merge the information
          if (existingProgramIndex > -1) {
            const existingLeafs = provisionalLeafsByProgram[existingProgramIndex].provisionalLeafs
            const mergedLeafs = uniqBy([...newLeafs, ...existingLeafs], 'id')
            provisionalLeafsByProgram[existingProgramIndex].provisionalLeafs = mergedLeafs 
          } else {
            provisionalLeafsByProgram.push({
              programId: programLib.id!,
              programTitle: programLib.title!,
              provisionalLeafs: newLeafs
            }) 
          }
        }
      }
    } else {
      console.error('No provisional leafs found')
    }
  }
  return provisionalLeafsByProgram
}

const getProvisionalProgramData = async (req: NextApiRequest, res: NextApiResponse<ProgramApiResponse | {}>) => {
  try {
    const result = await getProvisionalValueSetDataByProgram()
    return res.status(200).json(result)

  } catch (e: any) {
    logSimpleError(e)
    res.status(400).json({ error: 'Search for program failed.' })
  }
}

export default handler({
  GET: {
    action: getProvisionalProgramData
  }
})
