import cloneDeep from 'lodash.clonedeep'
import { provisionalVsBase } from './server/templates/provisionalVsBase'

interface CodeItem {
  code: string
  display: string
}

type CodesBySystem = Record<string, CodeItem[]>

const addValueSetCodes = (vs: fhir4.ValueSet, codesBySystem: CodesBySystem) => {
  const clonedVs = cloneDeep(vs)

  const includeBlockToUpdate = clonedVs?.compose?.include?.length ? cloneDeep(clonedVs.compose.include) : []

  const systemUrls = Object.keys(codesBySystem)

  systemUrls.forEach(url => {
    if (vs?.compose?.include?.length) {
      const codeItemsToAdd = codesBySystem[url]
      // check if system & code exists, add if not present
      const systemMatchInd = vs.compose.include.findIndex(item => item.system === url)
      if (systemMatchInd > -1) {
        codeItemsToAdd.forEach(codeItem => {
          const codeMatchInd = includeBlockToUpdate[systemMatchInd]?.concept?.findIndex(c => c.code === )
          // if code already exists, override display value if it's different from what already exists
          if ()
        })
      }
    } else {
      // create a whole new compose.include block
    }
  })
}

const generateProvisionalVs = () => {

}