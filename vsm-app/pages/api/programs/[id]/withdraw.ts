import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirClient'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

const withdraw = async (req: NextApiRequest, res: NextApiResponse<{ message: string } | { error: string }>): Promise<void> => {
  const body = req.body
  try {
    await FhirClient.getInstance().operation({
      name: '$withdraw',
      resourceType: 'Library',
      id: req.query.id as string,
      method: 'POST',
      input: body
    })

    res.status(200).send({ message: `Program with id ${req.query.id} withdrawn` })
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: withdraw,
    access: ['admin', 'editor']
  }
})
