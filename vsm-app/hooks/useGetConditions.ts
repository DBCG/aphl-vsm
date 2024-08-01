import { ConditionItem } from '@/helpers/conditionHelpers'

import { fetcher } from '@/utils'
import useSWR from 'swr'

const useGetConditions = (): ConditionItem[] => {
  const { data: conditions, isLoading } = useSWR('/api/conditions', fetcher)    
  return conditions as ConditionItem[]
}

export { useGetConditions }
