import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { getLogger } from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import { ConditionItem, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'

export type ConditionsAPIResponse = ConditionItem[] | { error: string }

const getAllConditions = async (req: NextApiRequest, res: NextApiResponse<ConditionsAPIResponse>) => {
  try {
    const data = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: process.env.CONDITIONS_CANONICAL as string
      }
    }) as fhir4.Bundle

    // this will return a set of code/display pairs, along with their system info
    // e.g. SNOMED, ICD-10, etc. (our data is just snomed)
    const maybeValueSet = data?.entry?.[0]?.resource
    if (is.valueSet(maybeValueSet)) {
      const conditions = maybeValueSet.compose?.include || []
      const formatted = formatConditionsComposeInclude(conditions)
      return res.status(200).send(formatted)
    } else {
      getLogger().error('Could not retrieve conditions data')
      getLogger().debug('data from fhirCdrClient.search: ', JSON.stringify(data))
      return res.status(400).send({ error: 'Could not retrieve conditions data'}) 
    }
  } catch (e: any) {
    getLogger().error('error:  ', e?.response?.data?.text)
    res.status(400).json({ error: 'Search for conditions valueset failed.' })
  }
}

export default handler({
  GET: {
    action: getAllConditions
  }
})
