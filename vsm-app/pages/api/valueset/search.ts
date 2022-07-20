import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'
import { getSession } from 'next-auth/react'

export interface FetchError {
  errorType: 'oid-error' | 'failed-oids' | 'server-error' | 'fetch-error' | '',
  message: string
}

export interface SearchResponse {
  valueSets: fhir4.ValueSet[] | [],
  error?: FetchError,
  total: number | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  if (req.method === 'GET') {
    const {
      search, searchType,
      nameFilter, statusFilter, oidFilter, stewardFilter
    } = req.query
    let responseInfo: SearchResponse = {
      valueSets: [],
      total: null
    }

    try {
      let serverResponse
      switch (searchType) {
        case 'name':
          let searchParams = {
            'name:contains': search
          }
          try {
            serverResponse = await vsacFhirClient.search({
              resourceType: 'ValueSet',
              searchParams
            })


            if (serverResponse.entry) {
              responseInfo.valueSets = serverResponse.entry.map((item: any) => {
                item.resource.url = item.fullUrl
                return item.resource
              })

              responseInfo.total = serverResponse.total
              // responseInfo.next = serverResponse?.link?.find(l => l?.relation === 'next')?.url
              // responseInfo.last = serverResponse?.link?.find(l => l?.relation === 'last')?.url
              // responseInfo.previous = serverResponse?.link?.find(l => l?.relation === 'previous')?.url

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
            responseInfo.total = successfulOIDs.length

            const failedOIDs = oidList?.filter((oid) => !successfulOIDs?.includes(oid))

            if (failedOIDs.length > 0) {
              responseInfo.error = {
                errorType: 'failed-oids',
                message:
                  `Search for these OIDs failed: ${failedOIDs.join(', ')}.

                   Check if they are malformed or nonexistent and try again.`
              }
            }

          } catch (e) {
            console.error(e)
            responseInfo.error = {
              errorType: 'oid-error',
              message: `Search by OID failed.`
            }
          }

          break
      }

      res.status(200).send(responseInfo)
      return
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ 'server-error': 'ValueSet search failed.' })
      return
    }
  }
}