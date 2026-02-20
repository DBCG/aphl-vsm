import { apiFetch } from '@/utils'

const findProvVsUsingCode = async (provCsUrl: string, code: string) => {

  const endpoint = `/api/valueset/provisional?codeSystemUrl=${provCsUrl}&containsCode=${code}`

    let error
    let matchingValueSets: fhir4.ValueSet[] = []

    async function getProvisionalVsContainingCs(): Promise<void> {

        try {
          const response: Response = await apiFetch(endpoint)
          if (!response.ok) {
            error = `Failed to get provisional Value Sets containing url ${provCsUrl}`
          } else {
            const json = await response.json()
            if (json.error) {
              error = json.error
            } else if (json.length) {
              // check whether any of the matching valuesets contain that code
              matchingValueSets = json
            }
          }
        } catch (e) {
          error = 'Failed to update provisional codes'
        }
      }
    
    await getProvisionalVsContainingCs()

    const result = { error, matchingValueSets }
  return (result)
}

export { findProvVsUsingCode }