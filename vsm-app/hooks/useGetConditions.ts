import { ConditionItem } from '@/helpers/conditionHelpers'
import type { ConditionsAPIResponse } from '@/pages/api/conditions'

import { fetcher } from '@/utils'
import useSWR from 'swr'

const useGetConditions = (): ConditionItem[] => {
  const { data: conditions, isLoading } = useSWR('/api/conditions', (...args) =>
    fetcher(...args).catch((err) => { return { error: err.error || "Unknown error while fetching conditions" } }) as Promise<ConditionsAPIResponse>
  )
  return conditions as ConditionItem[]
}

export { useGetConditions }
