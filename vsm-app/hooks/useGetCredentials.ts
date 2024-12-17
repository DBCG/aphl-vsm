import useSWR from 'swr'
import { fetcher } from '@/utils'

// get all available user credentials
const useGetCredentials = ({ userId }: { userId: string }) => {

  const endpoint = `/api/credentials?userId=${userId}`

  const { data, error, isLoading, mutate } = useSWR(userId ? endpoint : null, fetcher)

  return {
    allUserCredentials: data,
    credsLoading: isLoading,
    errorGetCreds: error,
    mutateGetCreds: mutate
  }
}

export { useGetCredentials }