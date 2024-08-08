interface CodeItem {
  code: string
  display: string
  definition: string
}

interface CodeUpdate {
  old: CodeItem,
  new: CodeItem
}

interface UpdateData {
  action: 'replace-code',
  codeUpdates: CodeUpdate[],
  inValueSets: string[]
}

type Fields = Record<string, UpdateData>

const updateProvisionalCs = async (fields: Fields) => {
  let error: null | string = null
  let message = null

  const endpoint = `/api/codesystem/provisional`
    
    async function updateProvisionalCodesystemsAndVSParents(): Promise<void> {
        try {
          const response: Response = await fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(fields)
          })
          if (!response.ok) {
            error = 'Code update failed'
          } else {
            message = 'Code update successful'
          }
        } catch (e) {
          error = 'Failed to update provisional codes'
        }

      }
    
    await updateProvisionalCodesystemsAndVSParents()

  return ({ error, message })
}

export { updateProvisionalCs }