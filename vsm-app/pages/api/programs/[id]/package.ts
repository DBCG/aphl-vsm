import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { HapiError } from '@/types/hapiError'
import logger from '@/helpers/server/logger'
export type expectedPackageBody = { parameters: fhir4.Parameters; xml: boolean }
// this sets approvalDate and date and optionally
// creates an artifactCommentExtension
const crmi_package = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | string | { error: string }>): Promise<void> => {
  const { parameters, xml } = JSON.parse(req.body || {}) as expectedPackageBody
  try {
    if (!xml) {
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
            // ...fhirCdrClient.customHeaders
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
  } catch (e: any) {
    const error = e as HapiError
    logger.error('ERROR: ' + error.response?.data?.issue?.[0]?.code + " : " + error.response?.data?.issue?.[0]?.diagnostics)
    res.status(error.response?.status || 500).json({ error: error.response?.data?.issue?.[0]?.diagnostics || 'unknown' })
  }
}

export default handler({
  POST: {
    action: crmi_package,
    access: ['admin']
  }
})
