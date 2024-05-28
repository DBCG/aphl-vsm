import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import { merge } from 'lodash'

interface GrouperVSetInformation {
  id: string
  url: string
  version: string
  valueSets: string[]
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

type GrouperItem = Record<string, ProvisionalVsCsMap[]>

export type ProvisionalsByProgram = Record<string, GrouperItem>

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

    console.log('here: ', formattedProvisionalInfo)
    return formattedProvisionalInfo
  }
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

const getProvisionalValueSetDataByProgram = async () => {
  // get all system provisional info
  const provisionalVsAndCsData = await getAllValueSetsReferencingProvisionalCS()
  // get all programs
  const programs = await getAllPrograms()

  if (!programs?.length) {
    return ({})
  }

  let grouperValueSetsContainingProvisionalsByProgram = {} as ProvisionalsByProgram

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
    })) as GrouperVSetInformation[]
   
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
