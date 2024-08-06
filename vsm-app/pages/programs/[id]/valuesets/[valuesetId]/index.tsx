import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useContext, useEffect } from 'react'
import ValueSetContents from '@/components/ValueSetContents'
import LoadingIndicator from '@/components/LoadingIndicator'
import { VSMSession, allowEditing } from '@/helpers/rolesHelper'
import { NavContext } from '@/components/NavBar'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { isGrouperValueSet } from '@/helpers/valueSetHelpers'

const ValueSetPageView = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const valueSetId = router.query.valuesetId as string
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId })
  const { isGrouperView, changeGrouperView } = useContext(NavContext)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const enableEditing = allowEditing({ session, programStatus: programAndGrouperData?.program?.status })
  const { data: currentValueSet, mutate } = useSWR(!programAndGrouperDataLoading && valueSetId ? `/api/valueset?id=${valueSetId}` : null, fetcher)
  const handleToggleUpdateData = () => {
    mutate()
  }

  useEffect(() => {
    changeGrouperView(isGrouperValueSet(currentValueSet))
  }, [currentValueSet, changeGrouperView])


  if (!currentValueSet || programAndGrouperDataLoading) {
    return <LoadingIndicator />
  }

  return (
    <ValueSetContents
      setToggleUpdateData={(handleToggleUpdateData)}
      programId={programId}
      programAndGrouperInfo={programAndGrouperData}
      isGrouperValueSet={isGrouperView}
      valueSet={currentValueSet}
      enableEditing={enableEditing}
      isDraftProgram={programAndGrouperData?.program?.status === 'draft'}
    />
  )
}

export default ValueSetPageView
