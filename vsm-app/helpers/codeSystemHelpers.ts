import { UpdateData } from '@/pages/api/codesystem/provisional'
import { cloneDeep } from 'lodash'
import logger from './server/logger'

interface UpdateItems {
  cs: fhir4.CodeSystem
  action: 'replace'
  updateData: UpdateData
}

const updateCsCodeItem = ({ cs, action, updateData }: UpdateItems) => {
  try {
    const clonedCs = cloneDeep(cs)
    let codeConceptBlock = clonedCs.concept || []
  
    if (action === 'replace') {
      updateData.codeUpdates.forEach(updateItem => {
        const indexOfUpdate = codeConceptBlock?.findIndex((i) => i.code === updateItem.old.code)
        if (indexOfUpdate !== undefined && indexOfUpdate > -1) {
          codeConceptBlock[indexOfUpdate] = updateItem.new
        } else {
          const errorText = `Failed to replace code in system with url ${cs.url}`
          logger.error(errorText)
          throw new Error(errorText)
        }
      })
    }
    clonedCs.concept = codeConceptBlock
    return clonedCs
  } catch (e) {
    return ({ error: e.message })
  }
}

export { updateCsCodeItem }