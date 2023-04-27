import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'

// this only gets the program library
const expandProgram = async (req: NextApiRequest, res: NextApiResponse) => {
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

    const response = await vsacFhirClient.operation({
      name: '$expand',
      id: req.body.valueSetId,
      resourceType: 'ValueSet',
      method: 'POST',
      input: JSON.stringify(parameters),
      options: {
        headers: {
          'content-type': 'application/json'
        }
      }
    })

    res.status(200).send(response)
  } catch (e: any) {
    logger.error('error:  ', JSON.stringify(e, null, 2))
    res.status(404).json({ error: 'No results for expansion parameters.' })
  }
}

export default handler({
  POST: {
    action: expandProgram,
    access: ['admin', 'editor']
  }
})
