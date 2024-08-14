import useSWR from 'swr'
import { fetcher } from '@/utils'

const useGetProvisionalContext = () => {
  const endpoint = '/api/programs/provisional'

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher, { revalidateOnFocus: true })

  return {
    provisionalContext: data,
    isContextLoading: isLoading,
    provContextError: error,
    mutateProvContext: mutate
  }
}

export { useGetProvisionalContext }
