import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import retry from 'helpers/retryRequest'
import { SearchParams } from 'fhir-kit-client'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { fhirClient } from '@/backend/clients/FhirClient'
export interface FetchError {
  errorType: 'oid-error' | 'failed-oids' | 'server-error' | 'fetch-error' | ''
  message: string
  data?: string
}

export interface SearchResponse {
  valueSets: fhir4.ValueSet[]
  error?: FetchError
  total: number | null
  first: string | null
  next: string | null
  previous: string | null
  last: string | null
}

interface LinkItem {
  relation: string
  url: string
}

const offsetRegexStandard = /&_offset=\d+/
// ontoserver has what looks like a non-standard-FHIR way of declaring offsets in the link array
const offsetRegexOntoserver = /&_getpagesoffset=\d+/

const getOffsetFromUrl = (str?: string) =>
  str?.match(offsetRegexStandard)?.[0]?.split('_offset=')?.[1] || str?.match(offsetRegexOntoserver)?.[0]?.split('_getpagesoffset=')?.[1]

const searchValueSet = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  // @ts-ignore-next-line
  const {
    search,
    searchType,
    count,
    offset,
    terminologyServer
  }: {
    search: string
    searchType: 'oid' | 'title' | 'url'
    count: string
    offset?: string
    terminologyServer: 'vsac' | string
  } = req.query
  const responseInfo: SearchResponse = {
    valueSets: [],
    total: null,
    first: null,
    next: null,
    previous: null,
    last: null
  }
  try {
    // set the terminology client to be VSAC or other
    if (terminologyServer === 'vsac') {
      terminologyClient.setClient('vsac')
    } else {
      const authCredentials = await tsCredentialService.getCredentials(session.user.id, terminologyServer)
      const endpointResource = await fhirClient.getTerminologyServer(terminologyServer)
      const baseUrl = new URL(endpointResource?.address)
      if (endpointResource?.address == null) {
        throw new Error('Terminology server address is not set')
      } else if (!baseUrl.toString().endsWith('/fhir')) {
        baseUrl.pathname = '/fhir'
      }
      console.log(authCredentials)
      try {
        terminologyClient.setCustomClient({
          clientName: endpointResource.name as string,
          baseUrl: baseUrl.toString(),
          basicAuthHeader: `Basic ${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
        })
      } catch (e) {
        // IMPORTANT: If something goes wrong with setting the auth header we should protect the user's data
        // from being logged, hence this catch block        
        logger.error(`Something went wrong with setting the custom client for ${terminologyServer} and user ${session.user.id}`) 
        return res.status(500).json({ 'server-error': 'ValueSet search failed.' })
      }
    }
    const activeTerminologyClient = terminologyClient.getClient()
    let searchParams: SearchParams
    switch (searchType) {
      case 'title':
        searchParams = {
          'title:contains': search,
          status: 'active',
          _count: count,
          _offset: typeof offset === 'string' && offset
        }
        if (activeTerminologyClient) {
          try {
            const serverResponse = await retry(() =>
              activeTerminologyClient.search({
                resourceType: 'ValueSet',
                searchParams
              })
            )

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
              responseInfo.total = serverResponse.total || null
              responseInfo.first = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'first')?.url) || null
              responseInfo.next = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'next')?.url) || null
              responseInfo.previous = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'previous')?.url) || null
              responseInfo.last = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'last')?.url) || null
            } else {
              // nothing found for that search, not an error
              // will just fallback to the default responseInfo {}
            }
          } catch (e) {
            logger.error(e)
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
        const oidList: string[] = search?.split(',')
        if (activeTerminologyClient) {
          try {
            responseInfo.valueSets = (
              await Promise.allSettled(
                oidList.map(
                  (oid: string) =>
                    activeTerminologyClient.read({
                      resourceType: 'ValueSet',
                      id: oid
                    }) as Promise<fhir4.ValueSet>
                )
              )
            )
              ?.filter(is.promiseFulfilled)
              ?.map((val) => val.value)
              ?.filter((vs) => vs.status === 'active')

            const successfulOIDs = responseInfo?.valueSets?.map((v) => v?.id)
            responseInfo.total = successfulOIDs.length

            const failedOIDs = oidList?.filter((oid) => {
              return !successfulOIDs?.find((successfulOid) => successfulOid?.includes(oid))
            })

            if (failedOIDs?.length > 0) {
              const failureList = failedOIDs.join(', ')
              responseInfo.error = {
                errorType: 'failed-oids',
                data: failureList,
                message: `Search for these OIDs failed: ${failureList}.
  
                     Check if they are malformed or nonexistent and try again.`
              }
            }
          } catch (e) {
            logger.error(e)
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
        // VSAC also does not respect _sort
        searchParams = {
          url: search,
          status: 'active'
        } as SearchParams

        if (typeof offset === 'string') {
          searchParams._offset = offset
        }
        if (activeTerminologyClient) {
          try {
            const serverResponse = await activeTerminologyClient.search({
              resourceType: 'ValueSet',
              searchParams
            })

            if (serverResponse.entry) {
              // since VSAC doesn't support _sort parameter
              // and when searching by URL we only want one latest response
              // sort here by version, return only single latest result
              const sortedEntries = serverResponse.entry.length > 1
                ? serverResponse.entry
                  .sort((a: any, b: any) => {
                    return b.resource.version.localeCompare(a.resource.version)
                  })
                // don't need to sort if only 1 item
                : serverResponse.entry

              // only return first, latest item
              const latest = [sortedEntries[0]]

              responseInfo.valueSets = latest.map((item: any) => {
                return item.resource
              })
              // TODO need this for OID search too
              responseInfo.total = serverResponse.total || null
              responseInfo.first = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'first')?.url) || null
              responseInfo.next = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'next')?.url) || null
              responseInfo.previous = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'previous')?.url) || null
              responseInfo.last = getOffsetFromUrl(serverResponse?.link?.find((l: LinkItem) => l?.relation === 'last')?.url) || null
            }
          } catch (e) {
            logger.error(e)
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

    if (responseInfo.error) {
      return res.status(400).json(responseInfo)
    }

    res.status(200).send(responseInfo)
  } catch (e) {
    logger.error('error:  ', e)
    res.status(400).json({ 'server-error': 'ValueSet search failed.' })
    return
  }
}

export default handler({
  GET: { action: searchValueSet }
})
