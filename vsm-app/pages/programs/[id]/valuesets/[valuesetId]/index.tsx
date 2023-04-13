import { Result, useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import ValueSetContents from '@/components/ValueSetContents'
import LoadingIndicator from '@/components/LoadingIndicator'
import { VSMSession, can } from '@/helpers/rolesHelper'

const ValueSetPageView = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const programAndGrouperInfo = useGetProgramDetails({ id: programId })
  const [currentValueSet, setCurrentValueSet] = useState<fhir4.ValueSet | null>()

  const { data: session } = useSession() as unknown as { data: VSMSession }
  const enableEditing = programAndGrouperInfo.program.status === 'active' || can(session, 'edit')

  useEffect(() => {
    const fetchValueSet = async () => {
      const response = await fetch(`/api/valueset?id=${router.query.valuesetId}`)
      const json = await response.json()
      setCurrentValueSet(json)
    }
    if (router.query.valuesetId) {
      fetchValueSet()
    }
  }, [router.query.valuesetId])
  if (!currentValueSet) {
    return <LoadingIndicator />
  }

  return (
    <ValueSetContents
      programAndGrouperInfo={programAndGrouperInfo}
      valueSet={currentValueSet}
      enableEditing={enableEditing}
    />
  )
}

export default ValueSetPageView
