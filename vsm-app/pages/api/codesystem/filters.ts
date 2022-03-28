import { CapabilityStatement } from 'fhir/r4';
import type { NextApiRequest, NextApiResponse } from 'next'

const { VSAC_USERNAME, VSAC_API_KEY } = process.env
const authString = `${VSAC_USERNAME}:${VSAC_API_KEY}`
const headers = new Headers();
headers.set('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`)
const fetchOptions = { method: 'GET', headers }

interface CodeSystemFilters {
  valueUri: string
  valueString: string
}

const parseCapabilityStatement = (capabilityStatement: CapabilityStatement): CodeSystemFilters[]|undefined => {
  const filters = capabilityStatement.extension?.map(({ extension }) => {
    return {
      valueUri: extension?.find(({ url }) => url === 'system')?.valueUri,
      valueString: extension?.find(({ url }) => url === 'name')?.valueString
    } as CodeSystemFilters
  })

  return filters
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    const { baseUrl } = req.query
    if (!baseUrl) { console.error('Please provide a Terminology Server URL')}

    try {
      const response = await fetch(`${baseUrl}/metadata`, fetchOptions)
      const codeSystemFilters = parseCapabilityStatement(await response.json())

      res.status(200).send(JSON.stringify(codeSystemFilters))
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading CodeSystems failed' })
    }
  }
}
