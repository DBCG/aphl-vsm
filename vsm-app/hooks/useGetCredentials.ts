import useSWR from 'swr'
import { fetcher } from '@/utils'

// get all available user credentials
const useGetCredentials = () => {

  const endpoint = '/api/credentials'

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher)

  return {
    allUserCredentials: data,
    credsLoading: isLoading,
    errorGetCreds: error,
    mutateGetCreds: mutate
  }
}

export { useGetCredentials }