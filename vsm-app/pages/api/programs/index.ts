// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '../../../fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    try {
      const data = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          _profile: 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset-library',
          _sort: ['-version']
        }
      })

      const libs = data?.entry?.map((e: any) => e?.resource)
      const json = JSON.stringify(libs)
      res.status(200).send(json)

    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Search for program failed.' })
    }
  }
}
