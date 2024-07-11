<<<<<<< HEAD
import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { CreateProvisionalVs } from '@/helpers/provisionalVsHelpers'
=======
import { vsacFhirClient } from '@/fhirClients'
>>>>>>> be4a5382f9935743785ecdc0cce4415df09e6d4f
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

<<<<<<< HEAD
interface Body extends CreateProvisionalVs {
  grouperIds: string[]
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

=======
>>>>>>> be4a5382f9935743785ecdc0cce4415df09e6d4f
interface GetBody {
  systemUrl?: fhir4.CodeSystem['url']
}

<<<<<<< HEAD
interface ProvisionalReqGet  extends NextApiRequest {
  body: GetBody
}

const getCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

  const response = await vsacFhirClient.capabilityStatement()
  const flattened = response.extension.map((r: fhir4.Extension) => r.extension)
   const availableCs = flattened?.map((i: fhir4.BundleEntry) => {
    return ({
    //@ts-ignore
    uri: i?.find(item => item?.url === 'system')?.valueUri,
    //@ts-ignore
    name: i?.find(item => item?.url === 'name')?.valueString,
  })})

  return res.status(200).json(availableCs)
=======
interface ProvisionalReqGet extends NextApiRequest {
  body: GetBody
}
export type CodeSystemCapabilityReturn = { uri?: string; name?: string }[] | { error: string }
const getCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse<CodeSystemCapabilityReturn>) => {
  try {

    const response = await vsacFhirClient.capabilityStatement() as fhir4.CapabilityStatement
    const flattened = response.extension?.map((r) => r.extension)
    const availableCs = flattened?.map((i) => {
      return ({
        uri: i?.find(item => item?.url === 'system')?.valueUri,
        name: i?.find(item => item?.url === 'name')?.valueString,
      })
    }) || []

    return res.status(200).json(availableCs)
>>>>>>> be4a5382f9935743785ecdc0cce4415df09e6d4f

  } catch (e) {
    // logger.error(e)
    console.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

export default handler({
  GET: { action: getCodeSystems, access: ['admin', 'editor', 'reviewer'] },
})