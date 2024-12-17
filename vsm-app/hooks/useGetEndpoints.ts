import useSWR from 'swr'
import { fetcher } from '@/utils'

// get all available user credentials
const useGetEndpoints = () => {

  const endpoint = `/api/endpoint`

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher)

  console.log('data get endpoints***', data)
  console.log('error get endpoints***', error)
  // return
  return {
    allEndpoints: data,
    endpointsLoading: isLoading,
    errorEndpoints: error,
    mutateEndpoints: mutate
  }
}

export { useGetEndpoints }