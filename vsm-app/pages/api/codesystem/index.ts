import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import { VSMSession } from '@/helpers/rolesHelper'
import handler from '@/helpers/server/handler'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { getCodeSystemCatalogue } from '@/helpers/server/terminologyCapabilities'
import type { NextApiRequest, NextApiResponse } from 'next'

interface GetBody {
  systemUrl?: fhir4.CodeSystem['url']
}

interface ProvisionalReqGet extends NextApiRequest {
  body: GetBody
}
export type CodeSystemCapabilityReturn = { uri?: string; name?: string }[] | { error: string }
const getCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse<CodeSystemCapabilityReturn>, session: VSMSession) => {
  try {
    const userId = session.user.id
    const vsacFhirClient = await TerminologyFhirClient.getClient(userId)
    const availableCs = (await getCodeSystemCatalogue(vsacFhirClient)).codeSystems.map(({ uri, name }) => ({ uri, name }))

    return res.status(200).json(availableCs)

  } catch (e) {
    logSimpleError(e)
    res.status(400).json({ error: 'Search for Code Systems Failed' })
  }
}

export default handler({
  GET: { action: getCodeSystems, access: ['admin', 'publisher', 'editor', 'reviewer'] },
})