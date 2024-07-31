import { ConditionItem } from '@/helpers/conditionHelpers'
import type { ConditionsAPIResponse } from '@/pages/api/conditions'

import { fetcher } from '@/utils'
import useSWR from 'swr'

const useGetConditions = (): ConditionItem[] => {
  const { data: conditions, isLoading } = useSWR('/api/conditions', (...args) =>
    fetcher(...args).then((resp) => resp as ConditionsAPIResponse)
  )
  return conditions as ConditionItem[]
}

export { useGetConditions }
