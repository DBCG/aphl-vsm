import useSWR from 'swr'
import { fetcher } from '@/utils'

interface ReturnedData {
  uri: string
  name: string
}

const useGetCS = (): [] | ReturnedData[] => {
  let endpoint = '/api/codesystem'
  const {data: codeSystems, mutate} = useSWR(endpoint, fetcher)
  
  return codeSystems as ReturnedData[]
}

export { useGetCS }