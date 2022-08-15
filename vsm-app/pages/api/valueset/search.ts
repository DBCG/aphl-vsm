import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'
import { getSession } from 'next-auth/react'

export interface FetchError {
  errorType: 'oid-error' | 'failed-oids' | 'server-error' | 'fetch-error' | '',
  message: string,
  data?: string
}

export interface SearchResponse {
  valueSets: fhir4.ValueSet[] | []
  error?: FetchError
  total: number | null
  first: string | null
  next: string | null
  previous: string | null
  last: string | null
}

interface LinkItem {
  relation: string,
  url: string
}

const offsetRegex = /&_offset=\d+/

const getOffsetFromUrl = (str: string) => (
  str?.match(offsetRegex)?.[0]?.split('_offset=')?.[1]
)

interface SearchParams {
  'name:contains': string
  _count: string
  _offset?: string
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
      search, searchType, count, offset, sortBy, sortDirection,
      nameFilter, statusFilter, oidFilter, stewardFilter
    } = req.query
    let responseInfo = {
      valueSets: [],
      total: null
    } as SearchResponse

    try {
      let serverResponse
      switch (searchType) {
        case 'name':
          const sortStr = '-publisher'//`${sortDirection == 'asc' ? '' : '-'}${sortBy}`
          let searchParams = {
            'name:contains': search,
            _count: count,
            // _sort: sortStr
          } as SearchParams

          if (typeof offset === 'string') {
            searchParams._offset = offset
          }
          try {
            serverResponse = await vsacFhirClient.search({
              resourceType: 'ValueSet',
              // @ts-expect-error
              searchParams
            })

            if (serverResponse.entry) {
              responseInfo.valueSets = serverResponse.entry.map((item: any) => {
                item.resource.url = item.fullUrl
                return item.resource
              })
              // TODO need this for OID search too
              responseInfo.total = serverResponse.total
              responseInfo.first = getOffsetFromUrl(
                serverResponse?.link?.find((l: LinkItem) => l?.relation === 'first')?.url
              ) || null
              responseInfo.next = getOffsetFromUrl(
                serverResponse?.link?.find((l: LinkItem) => l?.relation === 'next')?.url
               ) || null
              responseInfo.previous = getOffsetFromUrl(
                serverResponse?.link?.find((l: LinkItem) => l?.relation === 'previous')?.url
              ) || null
              responseInfo.last = getOffsetFromUrl(
                serverResponse?.link?.find((l: LinkItem) => l?.relation === 'last')?.url
              ) || null

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
          // pagination is not going to work the same for the OID list because each is a separate query
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

            if (failedOIDs?.length > 0) {
              const failureList = failedOIDs.join(', ')
              responseInfo.error = {
                errorType: 'failed-oids',
                data: failureList,
                message:
                  `Search for these OIDs failed: ${failureList}.

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