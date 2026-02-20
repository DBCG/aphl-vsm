import useSWR from 'swr'
import { fetcher } from '@/utils'

interface ServerData {
  endpointId?: string
}
// test whether pinging /metadata returns a 200
const useTestTermEndpoint = (serverData: ServerData) => {
  const { endpointId } = serverData
  const endpoint = `/api/test-terminology-endpoint?endpointId=${endpointId}`

  const { data, error, isLoading, mutate } = useSWR(endpointId ? endpoint : null, fetcher)
  return {
    isEndpointValid: data?.status === 'ok',
    pingLoading: isLoading,
    pingError: error,
    pingMutate: mutate
  }
}

export { useTestTermEndpoint }