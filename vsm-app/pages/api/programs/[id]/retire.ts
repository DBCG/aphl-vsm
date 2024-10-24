import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

const retire = async (req: NextApiRequest, res: NextApiResponse<{ message: string } | { error: string }>): Promise<void> => {
  const body = req.body
  try {
    await fhirCdrClient.operation({
      name: '$retire',
      resourceType: 'Library',
      id: req.query.id as string,
      method: 'POST',
      input: body
    })

    res.status(200).send({ message: `Program with id ${req.query.id} retired` })
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: retire,
    access: ['admin', 'editor']
  }
})
