import useSWR from 'swr'
import { fetcher } from '@/utils'

// get all available user credentials
const useGetEndpoints = () => {

  const endpoint = `/api/endpoint`

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher)

  return {
    allEndpoints: data,
    endpointsLoading: isLoading,
    errorEndpoints: error,
    mutateEndpoints: mutate
  }
}

export { useGetEndpoints }