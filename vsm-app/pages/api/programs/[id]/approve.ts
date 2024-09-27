import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { AuthOptions } from "@/pages/api/auth/[...nextauth]"
import { getServerSession } from 'next-auth/next'
import { logSimpleError } from '@/helpers/server/simpleHapiError'


// this sets approvalDate and date and optionally
// creates an artifactAssessmentAuthor Extension
const approve = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | { error: string }>): Promise<void> => {
  const parameters = req.body || {}
  const session = await getServerSession(req, res, AuthOptions)
  const userEmail = session?.user?.email

  if (!userEmail) {
    throw ({ error: 'Unauthorized' })
  }

  const approvalUser = {
    name: 'artifactAssessmentAuthor',
    valueReference: {
      reference: userEmail
    }
  }
  parameters?.parameter?.push(approvalUser)

  try {
    const response = (await fhirCdrClient.operation({
      name: '$approve',
      resourceType: 'Library',
      id: req.query.id as string,
      method: 'POST',
      input: parameters
    })) as fhir4.Library

    res.status(200).send(response)
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: approve,
    access: ['admin', 'editor', 'reviewer']
  }
})
