import useSWR from 'swr'
import { fetcher } from '@/utils'

const useGetProvisionalVS = () => {
  const endpoint = '/api/valueset/provisional'
  const { data, error, isLoading } = useSWR(endpoint, fetcher)

  return {
    provisionalVS: data,
    isVsLoading: isLoading,
    provVsError: error
  }
}

export { useGetProvisionalVS }
