import useSWR from 'swr'
import { fetcher } from '@/utils'

interface ReturnedData {
  uri: string
  name: string
}

const useGetCS = (): CodeSystemCapabilityReturn => {
  let endpoint = '/api/codesystem'
  const {data: codeSystems} = useSWR(endpoint, (...args) => fetcher(...args).catch((err) => { return {error: err.error || "unknown error fetching CodeSystems"}}) as Promise<CodeSystemCapabilityReturn>)
  
  return codeSystems
}

export { useGetCS }