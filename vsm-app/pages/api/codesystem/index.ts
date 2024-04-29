import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
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

const getCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

    const {
      systemUrl
    } = req.query

  //  let searchParams = {
  //   ...(systemUrl && { url: systemUrl })
  //  }

  const response = await vsacFhirClient.capabilityStatement()
  const flattened = response.extension.map(r => r.extension)
   const availableCs = flattened?.map((i: fhir4.BundleEntry) => {
    return ({
    //@ts-ignore
    uri: i?.find(item => item?.url === 'system')?.valueUri,
    //@ts-ignore
    name: i?.find(item => item?.url === 'name')?.valueString,
  })})

  return res.status(200).json(availableCs)

  } catch (e) {
    // logger.error(e)
    console.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

export default handler({
  GET: { action: getCodeSystems, access: ['admin', 'editor'] },
})