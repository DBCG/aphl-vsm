import useSWR from 'swr'
import { fetcher } from '@/utils'
import { CodeSystemCapabilityReturn } from '@/pages/api/codesystem'

interface ReturnedData {
  uri: string
  name: string
}

const useGetCS = (): CodeSystemCapabilityReturn => {
  let endpoint = '/api/codesystem'
  const {data: codeSystems} = useSWR(endpoint, fetcher)
  
  return codeSystems as CodeSystemCapabilityReturn
}

export { useGetCS }