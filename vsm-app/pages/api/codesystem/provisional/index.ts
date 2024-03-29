import { fhirCdrClient } from '@/fhirClients'
import { CreateProvisionalVs } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

interface GetBody {
  systemUrl?: fhir4.CodeSystem['url']
}

interface ProvisionalReqGet  extends NextApiRequest {
  body: GetBody
}

const getProvisionalCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

    const {
      systemUrl
    } = req.query

   let searchParams = {
    version: 'PROVISIONAL'
  }

  if (systemUrl) {
    searchParams['url'] = systemUrl
  }

    // ideally I wouldn't be doing this and would just be using a searchParam on
    // an extension that designates provisional?
    const provisionalCodeSystems = await fhirCdrClient.search({
      resourceType: 'CodeSystem',
      searchParams
    })

    const results = provisionalCodeSystems?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]

    return res.status(200).json(results || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

export default handler({
  GET: { action: getProvisionalCodeSystems, access: ['admin', 'editor'] },
})