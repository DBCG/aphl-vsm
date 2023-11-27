import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
export type expectedPackageBody = { parameters: fhir4.Parameters; json: boolean }
// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML
const crmi_package = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | string | { error: string }>): Promise<void> => {
  const { parameters, json } = JSON.parse(req.body || {}) as expectedPackageBody
  console.log('parameters: ', parameters)
  try {
    if (json) {
      const response = (await fhirCdrClient.operation({
        name: '$crmi.package',
        resourceType: 'Library',
        id: req.query.id as string,
        method: 'POST',
        input: parameters
      })) as fhir4.Bundle
      res.send(response)
    } else {
      const response = await fetch(
        `${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$crmi.package?_format=application/fhir+xml`,
        {
          body: JSON.stringify(parameters),
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
            // should be Basic Auth creds
            ...fhirCdrClient.customHeaders
          }
        }).then(data => {
          if (data.ok) {
            return data.text()
          } else {
            throw new Error('Server error')
          }
        })
      res.send(response)
    }
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: crmi_package,
    access: ['admin']
  }
})
