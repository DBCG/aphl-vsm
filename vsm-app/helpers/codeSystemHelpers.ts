import { DeleteData, UpdateData } from '@/pages/api/codesystem/provisional'
import { cloneDeep } from 'lodash'
import logger from '@/helpers/server/logger'

interface UpdateItems {
  cs: fhir4.CodeSystem
  action: 'replace-code'
  updateData: UpdateData
}

interface DeleteItems {
  cs: fhir4.CodeSystem
  action: 'delete-code'
  updateData: DeleteData
}

interface ErrorItem {
  error: string
}

const updateCsCodeItem = ({ cs, action, updateData }: UpdateItems | DeleteItems) => {
  try {
    const clonedCs = cloneDeep(cs)
    let codeConceptBlock = clonedCs.concept || []
  
    if (action === 'replace-code') {
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
    } else if (action === 'delete-code') {
      updateData.codeUpdates.forEach(deleteItem => {
        const indexOfDelete = codeConceptBlock?.findIndex((i) => i.code === deleteItem.code)
        if (indexOfDelete !== undefined && indexOfDelete > -1) {
          codeConceptBlock.splice(indexOfDelete, 1)
        } else {
          const errorText = `Failed to delete code in system with url ${cs.url}`
          logger.error(errorText)
          throw new Error(errorText)
        }
      })
    }
    clonedCs.concept = codeConceptBlock
    return clonedCs
  } catch (e: any) {
    return ({ error: e?.message || 'Failed to update code item' })
  }
}

export { updateCsCodeItem }