import useSWR, { mutate } from 'swr'
import { fetcher } from '@/utils'

const useGetProvisionalCS = (systemUrl?: string | undefined) => {
  let endpoint = '/api/codesystem/provisional'
  if (systemUrl) {
    endpoint = endpoint + `?systemUrl=${systemUrl}`
  }
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher)

  return {
    provisionalCS: data,
    isCsLoading: isLoading,
    provCsError: error,
    mutateProvCs: mutate
  }
}

export { useGetProvisionalCS }
