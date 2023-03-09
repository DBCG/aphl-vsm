import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import retry from 'helpers/retryRequest'
import { SearchParams } from 'fhir-kit-client'

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

const offsetRegexStandard = /&_offset=\d+/
// ontoserver has what looks like a non-standard-FHIR way of declaring offsets in the link array
const offsetRegexOntoserver = /&_getpagesoffset=\d+/

const getOffsetFromUrl = (str: string) => (
  str?.match(offsetRegexStandard)?.[0]?.split('_offset=')?.[1]
  || str?.match(offsetRegexOntoserver)?.[0]?.split('_getpagesoffset=')?.[1]
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  if (req.method === 'GET') {
    // @ts-ignore-next-line
    const { search, searchType, count, offset, terminologyServer }:
      {
        search: string,
        searchType: 'oid' | 'name' | 'url',
        count: string,
        offset?: string,
        terminologyServer: 'vsac' | 'ontoserverR4'
      } = req.query
    let responseInfo = {
      valueSets: [],
      total: null
    } as SearchResponse
    try {
      // set the terminology client to be VSAC or other
      terminologyClient.setClient(terminologyServer)
      const activeTerminologyClient = terminologyClient.getClient()
      let serverResponse
      let searchParams: SearchParams
      switch (searchType) {
        case 'name':
          searchParams = {
            'name:contains': search,
            status: 'active',
            _count: count,
          }

          if (typeof offset === 'string') {
            searchParams._offset = offset
          }
          if (activeTerminologyClient) {
            try {
              serverResponse = await retry(() => activeTerminologyClient.search({
                resourceType: 'ValueSet',
                searchParams,
                options: {
                  // @ts-ignore-next-line no idea why this is a TS fail, timeout is on the AbortSignal obj
                  signal: AbortSignal.timeout(30000)
                }
              }))

              if (serverResponse.entry) {
                responseInfo.valueSets = serverResponse.entry.map((item: any) => {
                  if (!item?.resource) {
                    return
                  } else if (!item.resource.url) {
                    item.resource.url = item.fullUrl
                  }
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

              } else {
                console.error('no entry: ')
              }
            } catch (e) {
              console.error(e)
              responseInfo.error = {
                errorType: 'server-error',
                message: `Search for '${search}' failed.`
              }
            }
          } else {
            responseInfo.error = {
              errorType: 'server-error',
              message: `Connection to terminology server failed.`
            }
          }
          break
        case 'oid':
          // pagination is not going to work the same for the OID list because each is a separate query
          // OID is actually kindof search by canonical
          // @ts-ignore-next-line
          const oidList: string[] = search?.split(',')
          if (activeTerminologyClient) {
            try {
              serverResponse = await Promise.allSettled(oidList.map((oid: string) => (
                activeTerminologyClient.read({
                  resourceType: 'ValueSet',
                  id: oid
                })
              )))

              responseInfo.valueSets = serverResponse
                ?.map(item => item?.status === 'fulfilled' && item?.value)
                ?.filter(x => !!x)
                // filter out inactive VS
                // @ts-ignore-next-line
                ?.filter((vs: fhir4.ValueSet) => vs.status === 'active') as fhir4.ValueSet[]

              const successfulOIDs = responseInfo?.valueSets?.map(v => v?.id)
              responseInfo.total = successfulOIDs.length

              const failedOIDs = oidList?.filter((oid) => {
                return !successfulOIDs?.find(successfulOid => successfulOid?.includes(oid))
              })

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
          } else {
            responseInfo.error = {
              errorType: 'server-error',
              message: `Connection to terminology server failed.`
            }
          }
          break
        case 'url':
          // VSAC is not respecting status=active. The following request shows some draft VS:
          // http://cts.nlm.nih.gov/fhir/ValueSet?status=active
          searchParams = {
            'url:contains': search,
            _count: count,
            status: 'active'
          } as SearchParams

          if (typeof offset === 'string') {
            searchParams._offset = offset
          }
          if (activeTerminologyClient) {
            try {
              serverResponse = await activeTerminologyClient.search({
                resourceType: 'ValueSet',
                searchParams
              })

              if (serverResponse.entry) {
                responseInfo.valueSets = serverResponse.entry.map((item: any) => {
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
                message: `Search for '${search}' in url failed.`
              }
            }
          } else {
            responseInfo.error = {
              errorType: 'server-error',
              message: `Connection to terminology server failed.`
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
