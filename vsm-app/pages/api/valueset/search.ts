import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    const { search, searchType } = req.query

    try {
      let response;
      switch (searchType) {
        case 'name':
          response = await vsacFhirClient.search({
            resourceType: 'ValueSet', searchParams: { 'name:contains': search }
          })
          break
        case 'oid':
          const oidList = search?.split(',')
          response = await Promise.all(oidList.map((oid: string) => (
            vsacFhirClient.read({
              resourceType: 'ValueSet', id: oid
            })
          )))

          break
        // not currently using steward as a search
        case 'steward':
          response = await vsacFhirClient.search({
            resourceType: 'ValueSet', searchParams: { 'publisher:contains': search }
          })
      }

      res.status(200).send(response)
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  }
}