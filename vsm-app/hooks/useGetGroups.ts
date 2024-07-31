import { fetcher } from '@/utils'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
interface GroupArgs {
  programId: string
  refreshToggle?: Boolean
}

interface GroupsResponse {
  groups: fhir4.ValueSet[]
  groupsError: string | null
  groupsLoading: boolean
}

const useGetGroups = ({ programId, refreshToggle }: GroupArgs): GroupsResponse => {
  const endpoint = `/api/programs/${programId}/details/valuesets/groups`
  const { data, isLoading, error, mutate } = useSWR(!programId ? null : endpoint, fetcher)

  useEffect(() => {
    if (refreshToggle) {
      mutate()
    }
  }, [refreshToggle, mutate])

  return { groups: data, groupsError: error, groupsLoading: isLoading }
}

export { useGetGroups }
