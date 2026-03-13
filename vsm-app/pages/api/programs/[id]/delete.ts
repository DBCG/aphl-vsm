import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

const deleteProgram = async (req: NextApiRequest, res: NextApiResponse<{ message: string } | { error: string }>): Promise<void> => {
  const body = req.body
  const programId = req.query.id as string
  try {
    // Delete associated ArtifactAssessment (approval) records first to avoid referential integrity errors
    const asstSearchResult = await FhirClient.getInstance().search({
      resourceType: 'Basic',
      searchParams: { artifact: programId }
    }) as fhir4.Bundle
    const assessmentIds = (asstSearchResult?.entry?.map((e) => e?.resource?.id).filter(Boolean) ?? []) as string[]
    await Promise.all(assessmentIds.map((id) => FhirClient.getInstance().delete({ resourceType: 'Basic', id })))

    await FhirClient.getInstance().operation({
      name: '$delete',
      resourceType: 'Library',
      id: programId,
      method: 'POST',
      input: body
    })

    res.status(200).send({ message: `Program with id ${programId} deleted` })
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: deleteProgram,
    access: ['admin', 'editor']
  }
})
