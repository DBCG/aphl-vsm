import useSWR from 'swr'
import { fetcher } from '@/utils'

interface ReturnedData {
  uri: string
  name: string
}

const useGetCS = (): ReturnedData[] => {
  let endpoint = '/api/codesystem'
  const {data: codeSystems, error} = useSWR(endpoint, fetcher)

  if (error) {
    console.error(error)
  }
  
  return codeSystems as ReturnedData[]
}

export { useGetCS }