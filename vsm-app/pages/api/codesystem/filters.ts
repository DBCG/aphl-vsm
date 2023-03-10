import { CapabilityStatement } from 'fhir/r4'
import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'

export interface CodeSystemFilters {
  valueUri: string
  valueString: string
}

// Takes a capability statement, extracts the `extension` field that contains the data for filtering ValueSets by CodeSystem
const parseCapabilityStatement = (capabilityStatement: CapabilityStatement): CodeSystemFilters[] | undefined => {
  const filters = capabilityStatement.extension?.map(({ extension }) => {
    return {
      valueUri: extension?.find(({ url }) => url === 'system')?.valueUri,
      valueString: extension?.find(({ url }) => url === 'name')?.valueString
    } as CodeSystemFilters
  })

  return filters
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'GET') {
    try {
      const response = await vsacFhirClient.capabilityStatement()
      const codeSystemFilters = parseCapabilityStatement(response as CapabilityStatement)

      res.status(200).send(codeSystemFilters)
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading CodeSystems failed' })
    }
  }
}
