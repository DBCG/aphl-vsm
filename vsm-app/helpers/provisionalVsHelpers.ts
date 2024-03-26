import cloneDeep from 'lodash.clonedeep'
import uniqBy from 'lodash.uniqby'
import { provisionalVsBase } from './server/templates/provisionalVsBase'
import { provisionalCsBase } from './server/templates/provisionalCsBase'
import { generateNameFromTitle } from './stringHelpers'
import { authoritativeSourceExtensionUrl } from './valueSetHelpers'

interface CodeItem {
  code: string
  display: string
}

export type CodesBySystem = Record<string, CodeItem[]>

export const addOrRemoveVsCodes = (vs: fhir4.ValueSet, codesBySystemToEdit: CodesBySystem, action: 'add' | 'remove') => {
  const clonedVs = cloneDeep(vs)

  const includeBlockToUpdate = clonedVs?.compose?.include?.length ? cloneDeep(clonedVs.compose.include) : []

  const systemUrls = Object.keys(codesBySystemToEdit)

  systemUrls.forEach(url => {
    const systemIndex = includeBlockToUpdate?.findIndex(i => i?.system === url)
    if (action === 'add') {
      if (systemIndex === -1) {
        includeBlockToUpdate.push({
          system: url,
          concept: codesBySystemToEdit[url]
        })
      } else {
        // if items already exist in this system, filter out dupes
        // with newer code pairs overriding old ones
        const existingCodes = includeBlockToUpdate[systemIndex].concept || []
        const totalCodeList = codesBySystemToEdit[url].concat(existingCodes)
        const updatedSystemCodes = uniqBy(totalCodeList, 'code')
        includeBlockToUpdate[systemIndex] = {
          system: url,
          concept: updatedSystemCodes
        }
      }
    } else if (action === 'remove') {
      if (typeof systemIndex === 'number' && systemIndex > -1) {
        const codesToRemove = codesBySystemToEdit[url].map(i => i.code)
        const filteredSystemCodes = includeBlockToUpdate[systemIndex].concept?.filter(con => !codesToRemove.includes(con.code))
        if (!filteredSystemCodes?.length) {
          delete includeBlockToUpdate[systemIndex]
        } else {
          includeBlockToUpdate[systemIndex] = {
            system: url,
            concept: filteredSystemCodes
          } 
        }
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

      const authSourceExists = clonedVs.extension?.find(ext => ext.url === authoritativeSourceExtensionUrl)
      // add authoritative source if it doesn't exist
      // needed to wait for this until URL was generated
      if (!authSourceExists) {
        extensionsToUpdate.push({
          url: authoritativeSourceExtensionUrl,
          valueUri: clonedVs.url
        })
      }
    }
  }

  clonedVs.extension = extensionsToUpdate
  return clonedVs
}

// codes and title are required
export interface CreateProvisionalVs {
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
  clonedVs = addOrRemoveVsCodes(clonedVs, codesBySystemToAdd, 'add')
  
  return clonedVs
}

interface CodeItem {
  code: string
  display: string
  definition: string
}

interface ProvisionalCodeSystemItems {
  systemBaseUrl: string
  codeItems: CodeItem[]
}

const createConceptItems = (codeItemsToAdd: CodeItem[]) => {
  return codeItemsToAdd.map(item => ({
    code: item.code,
    display: item.display,
    definition: item.definition
  }))
}

interface UpdateCSCodes {
  codeSystem: fhir4.CodeSystem
  codeItems: fhir4.CodeSystemConcept[]
  action: 'add' | 'remove'
}
// if code already exists, 'add' will override with the latest definition
export const updateCsCodes = ({
  codeSystem,
  codeItems,
  action
}: UpdateCSCodes) => {
  const clonedCS = cloneDeep(codeSystem)
  const existingConcept = clonedCS.concept || []
  if (action === 'add') {
    const newConcept = uniqBy([...codeItems, ...existingConcept], 'code')
    clonedCS.concept = newConcept
  } else if (action === 'remove') {
    const codesToDelete = codeItems.map(i => i.code)
    const filteredConcept = existingConcept.filter(c => !codesToDelete.includes(c.code))
    if (!filteredConcept?.length) {
      delete clonedCS.concept
    } else {
      clonedCS.concept = filteredConcept 
    }
  }
  return clonedCS
}


// pull out into codeSystem helpers maybe
export const createProvisionalCodeSystem = ({
  systemBaseUrl,
  codeItems
}: ProvisionalCodeSystemItems): fhir4.CodeSystem => {
  let codeSystemBase = provisionalCsBase

  // this is dynamic based on the code system, so can't be templated
  codeSystemBase.url = systemBaseUrl

  const concept = createConceptItems(codeItems)

  const result = Object.assign(codeSystemBase, { concept })

  return result
}



