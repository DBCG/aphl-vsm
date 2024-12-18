import { fetcher } from '@/utils'
import useSWR from 'swr'

interface EndpointRes {
  terminologySources: any
  error: string | null
  endpointsLoading: boolean
  mutate: () => void
}

const useGetEndpointOptionsForUI = (): EndpointRes => {
  const { data: currentEndpoints = null, isLoading: endpointsLoading, error, mutate } = useSWR('/api/endpoint?user_set=true', fetcher)
  const terminologySources = [
    ...(currentEndpoints?.endpoints?.map((i: any) => ({ label: i?.name, value: { id: i?.id, url: i?.address } })) || [])
  ]
  return { terminologySources, endpointsLoading, error, mutate }
}

export { useGetEndpointOptionsForUI }