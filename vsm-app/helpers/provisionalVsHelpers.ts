import cloneDeep from 'lodash.clonedeep'
import uniqBy from 'lodash.uniqby'
import { provisionalVsBase } from './server/templates/provisionalVsBase'
import { generateNameFromTitle } from './stringHelpers'

interface CodeItem {
  code: string
  display: string
}

type CodesBySystem = Record<string, CodeItem[]>

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
  title: string | undefined
  author: string | undefined
  steward: string | undefined
}

const updateVsMetadata = ({
  vsToUpdate,
  author,
  steward,
  title,
}: UpdateVsMetadata) => {
  const clonedVs = cloneDeep(vsToUpdate)
  if ((author || steward) && !clonedVs?.extension) {
    clonedVs.extension = []
  }

  let extensionsToUpdate = cloneDeep(clonedVs.extension) as fhir4.Extension[]
  const authorToAdd = (typeof author === 'string' && author.trim().length) ? author.trim() : null
  const stewardToAdd = (typeof steward === 'string' && steward.trim().length) ? steward.trim() : null
  const titleToAdd = (typeof title === 'string' && title.trim().length) ? title.trim() : null

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
        clonedVs.url = `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/ValueSet/${name}`
      }
    }
  } 
}

const generateProvisionalVs = () => {

}