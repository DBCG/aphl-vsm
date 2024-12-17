import useSWR from 'swr'
import { fetcher } from '@/utils'

// get all available user credentials
const useGetCredentials = ({ userId }: { userId: string }) => {

  const endpoint = `/api/credentials?userId=${userId}`

  const { data, error, isLoading, mutate } = useSWR(userId ? endpoint : null, fetcher)

  console.log('data get creds***', data)
  console.log('error get creds***', error)
  // return
  return {
    allUserCredentials: data,
    credsLoading: isLoading,
    errorGetCreds: error,
    mutateGetCreds: mutate
  }
}

export { useGetCredentials }