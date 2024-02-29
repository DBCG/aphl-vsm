import cloneDeep from 'lodash.clonedeep'
import uniqBy from 'lodash.uniqby'
import { provisionalVsBase } from './server/templates/provisionalVsBase'
import { generateNameFromTitle } from './stringHelpers'

interface CodeItem {
  code: string
  display: string
}

export type CodesBySystem = Record<string, CodeItem[]>

export const addValueSetCodes = (vs: fhir4.ValueSet, codesBySystemToAdd: CodesBySystem) => {
  const clonedVs = cloneDeep(vs)

  const includeBlockToUpdate = clonedVs?.compose?.include?.length ? cloneDeep(clonedVs.compose.include) : []

  const systemUrls = Object.keys(codesBySystemToAdd)

  systemUrls.forEach(url => {
    const systemIndex = includeBlockToUpdate?.findIndex(i => i?.system === url)
    if (systemIndex === -1) {
      includeBlockToUpdate.push({
        system: url,
        concept: codesBySystemToAdd[url]
      })
    } else {
      // if items already exist in this system, filter out dupes
      // with newer code pairs overriding old ones
      const existingCodes = includeBlockToUpdate[systemIndex].concept || []
      const totalCodeList = codesBySystemToAdd[url].concat(existingCodes)
      const updatedSystemCodes = uniqBy(totalCodeList, 'code')
      includeBlockToUpdate[systemIndex] = {
        system: url,
        concept: updatedSystemCodes
      }
    }
  })

  clonedVs.compose = { include: includeBlockToUpdate }
  return clonedVs
}

interface UpdateVsMetadata {
  vsToUpdate: fhir4.ValueSet
  titleToUpdate: string | undefined
  authorToUpdate: string | undefined
  stewardToUpdate: string | undefined
}

export const updateVsMetadata = ({
  vsToUpdate,
  authorToUpdate,
  stewardToUpdate,
  titleToUpdate,
}: UpdateVsMetadata): fhir4.ValueSet => {

  const clonedVs = cloneDeep(vsToUpdate)
  if ((authorToUpdate || stewardToUpdate) && !clonedVs?.extension) {
    clonedVs.extension = []
  }

  let extensionsToUpdate = cloneDeep(clonedVs.extension) as fhir4.Extension[]
  const authorToAdd = (typeof authorToUpdate === 'string' && authorToUpdate.trim().length) ? authorToUpdate.trim() : null
  const stewardToAdd = (typeof stewardToUpdate === 'string' && stewardToUpdate.trim().length) ? stewardToUpdate.trim() : null
  const titleToAdd = (typeof titleToUpdate === 'string' && titleToUpdate.trim().length) ? titleToUpdate.trim() : null

  // update Author
  if (authorToAdd) {
    extensionsToUpdate = extensionsToUpdate
      .filter(ext => !ext.url.endsWith('/valueset-author'))
      
    extensionsToUpdate.push({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
      valueContactDetail: {
        name: authorToAdd
      }
    })
  } 
  // update Steward
  if (stewardToAdd) {
    extensionsToUpdate = extensionsToUpdate
      .filter(ext => !ext.url.endsWith('/valueset-steward'))

    extensionsToUpdate.push({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
      valueContactDetail: {
        name: stewardToAdd
      }
    })
  }

  if (titleToAdd) {
    clonedVs.title = titleToAdd
    // if vs name already exists on the valueset, keep it and url the same
    // if it doesn't, generate them from the title
    // if you change these every time, you would break references from groupers
    if (!clonedVs.name) {
      const name = generateNameFromTitle(titleToAdd, `Provisional ValueSet ${Date.now()}`)
      clonedVs.name = name
      // if url doesn't already exist (happens with brand new valueset), add it
      if (!clonedVs.url) {
        clonedVs.url = `${process.env.FHIR_CDR_URL}/ValueSet/${name}`
      }
    }
  }

  // have to wait to create trusted-expansion extension until the ValueSet's name exists
  const trustedExpansionExtension = {
    url: 'http://hl7.org/fhir/StructureDefinition/valueset-trusted-expansion',
    valueUri: `${process.env.FHIR_CDR_URL}/ValueSet/${clonedVs.name}`
  } as fhir4.Extension

  const trustedExpansionIdx = extensionsToUpdate?.findIndex(ext => ext.url.endsWith('/valueset-trusted-expansion'))
  if (trustedExpansionIdx === -1) {
    extensionsToUpdate.push(trustedExpansionExtension)
  }

  clonedVs.extension = extensionsToUpdate
  return clonedVs
}

// codes and title are required
interface CreateProvisionalVs {
  codesBySystemToAdd: CodesBySystem
  titleToUpdate: string
  authorToUpdate: string | undefined
  stewardToUpdate: string | undefined
}

// the function to generate a provisional valueset for the first time
// it is separate from the update function because more things are required as specific input
export const generateProvisionalVs = ({
  authorToUpdate,
  stewardToUpdate,
  titleToUpdate,
  codesBySystemToAdd
}: CreateProvisionalVs): fhir4.ValueSet | null => {
  // cannot continue without these params
  if (!titleToUpdate || !codesBySystemToAdd) {
    return null
  }

  let clonedVs = cloneDeep(provisionalVsBase)
  // add metadata and codes
  clonedVs = updateVsMetadata({ vsToUpdate: clonedVs, authorToUpdate, stewardToUpdate, titleToUpdate })
  clonedVs = addValueSetCodes(clonedVs, codesBySystemToAdd)
  
  return clonedVs
}