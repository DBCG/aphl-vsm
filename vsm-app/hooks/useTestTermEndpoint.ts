import useSWR from 'swr'
import { fetcher } from '@/utils'

interface ServerData {
  endpointUrl: string
  endpointName: string
  endpointId: string
}
// test whether pinging /metadata returns a 200
const useTestTermEndpoint = (serverData: ServerData) => {
  const { endpointUrl, endpointName, endpointId } = serverData
  const endpoint = `/api/test-terminology-endpoint?endpointName=${endpointName}&endpointUrl=${endpointUrl}&endpointId=${endpointId}`

  const { data, error, isLoading, mutate } = useSWR(endpointUrl ? endpoint : null, fetcher)
  return {
    isEndpointValid: data?.status === 'ok',
    pingLoading: isLoading,
    pingError: error,
    pingMutate: mutate
  }
}

export { useTestTermEndpoint }