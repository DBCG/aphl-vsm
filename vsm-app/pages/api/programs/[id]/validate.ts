import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

interface Issue {
  severity: string
  code: string
  diagnostics: string
}

type ErrorRes = { error: Issue[] }

const validatePackage = async (req: NextApiRequest, res: NextApiResponse<ErrorRes | {}>): Promise<void> => {
  const body = JSON.parse(req.body)
  console.log('body: ', body)
  const { programId, program } = body
  const parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'resource',
        resource: program
      }
    ]
  }
  try {
    const response = (await fhirCdrClient.operation({
      name: '$validate',
      resourceType: 'Library',
      id: programId as string,
      input: JSON.stringify(parameters),
      method: 'POST',
    }))

    if (response?.resourceType === 'OperationOutcome') {
      const issues = response.issue?.map((i: fhir4.OperationOutcomeIssue) => ({
        severity: i.severity,
        code: i.code,
        diagnostics: i.diagnostics
      }))
      return res.status(200).json({ error: issues })
    } else {
      return res.status(200).json({}) 
    }
    
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: validatePackage,
    access: ['admin', 'editor']
  }
})
