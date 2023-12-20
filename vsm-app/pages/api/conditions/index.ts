import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'

export type ConditionsAPIResponse = fhir4.ValueSetComposeInclude[] | { error: string }
const getConditions = async (req: NextApiRequest, res: NextApiResponse<ConditionsAPIResponse>) => {
  try {
    const data = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: process.env.CONDITIONS_CANONICAL as string
      }
    }) as fhir4.Bundle

    // this will return a set of code/display pairs, along with their system info
    // e.g. SNOMED, ICD-10, etc. (our data is just snomed)
    const valueSet = (<fhir4.ValueSet>data?.entry?.[0]?.resource)?.compose?.include || []
    res.status(200).send(valueSet)
  } catch (e: any) {
    logger.error('error:  ', e?.response?.data?.text)
    res.status(400).json({ error: 'Search for conditions valueset failed.' })
  }
}

export default handler({
  GET: {
    action: getConditions
  }
})
