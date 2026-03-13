import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'

const getBasePath = async (req: NextApiRequest, res: NextApiResponse) => {
  const base = process.env.NEXTAUTH_URL

  if (!base) {
    res.status(404).send({ error: 'No base path set for FHIR API' })
  }

  const basePath = `${base}/api/fhir`

  res.status(200).send({ path: basePath })
}

export default handler({
  GET: { action: getBasePath, access: ['admin', 'publisher'] },
})
