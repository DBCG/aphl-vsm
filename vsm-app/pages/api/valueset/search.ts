import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'

interface FetchError {
  errorType: 'server-error' | 'failed-oids' | '',
  message: string
}

interface Response {
  valueSets: fhir4.ValueSet[] | [],
  error?: FetchError
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    const { search, searchType } = req.query
    let responseInfo: Response = {
      valueSets: []
    }

    try {
      let serverResponse
      switch (searchType) {
        case 'name':
          try {
            serverResponse = await vsacFhirClient.search({
              resourceType: 'ValueSet', searchParams: { 'name:contains': search }
            })

            if (serverResponse.entry) {
              responseInfo.valueSets = serverResponse.entry.map((item) => (
                item.resource
              ))
            }
          } catch (e) {
            console.error(e)
            responseInfo.error = {
              errorType: 'server-error',
              message: `Search for '${search}' failed.`
            }
          }
          break
        case 'oid':
          // @ts-ignore-next-line
          const oidList: string[] = search?.split(',')
          try {
            serverResponse = await Promise.allSettled(oidList.map((oid: string) => (
              vsacFhirClient.read({
                resourceType: 'ValueSet', id: oid
              })
            )))

            responseInfo.valueSets = serverResponse
              ?.map(item => item?.status === 'fulfilled' && item?.value)
              ?.filter(x => x) as fhir4.ValueSet[]

            const successfulOIDs = responseInfo?.valueSets?.map(v => v?.id)

            const failedOIDs = oidList?.filter((oid) => successfulOIDs?.includes(oid))

            if (failedOIDs.length > 0) {
              responseInfo.error = {
                errorType: 'failed-oids',
                message: `Search for these OIDs failed: ${failedOIDs.join(', ')}.`
              }
            }

          } catch (e) {
            console.error(e)
            responseInfo.error = {
              errorType: 'server-error',
              message: `Search by OID failed.`
            }
          }

          break
      }

      res.status(200).send(responseInfo)
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  }
}