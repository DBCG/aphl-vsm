import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'

// this only gets the program library
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'POST') {
    try {
      const systems = Object.keys(req.body.expansionParameters)
      const parameter = [] as fhir4.ParametersParameter[]
      systems.forEach((system) => {
        const systemVersions: string[] = req.body.expansionParameters[system]
        const addToParameter = systemVersions.map((version: string) => ({
          name: 'system-version',
          valueCanonical: `${system}|${version}`
        }))
        parameter.push(...addToParameter)
      })

      const parameters = {
        resourceType: 'Parameters',
        parameter
      } as fhir4.Parameters
      console.log(parameters)
      const response = await vsacFhirClient.request(`ValueSet/${req.body.valueSetId}/$expand`, {
        method: 'POST',
        body: JSON.stringify(parameters),
        options: {
          headers: {
            'content-type': 'application/json'
          }
        }
      })

      res.status(200).send(response)
    } catch (e: any) {
      console.error('error:  ', JSON.stringify(e, null, 2))
      res.status(404).json({ error: 'No results for expansion parameters.' })
    }
  } else {
    res.status(405).json({ error: 'Method not supported.' })
  }
}
