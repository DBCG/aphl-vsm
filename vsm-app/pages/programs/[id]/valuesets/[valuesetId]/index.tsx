import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useContext } from 'react'
import ValueSetContents from '@/components/ValueSetContents'
import LoadingIndicator from '@/components/LoadingIndicator'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { NavContext } from '@/components/NavBar'

const ValueSetPageView = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const [toggleUpdateData, setToggleUpdateData] = useState(false)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId, toggleRefresh: toggleUpdateData })
  const [currentValueSet, setCurrentValueSet] = useState<fhir4.ValueSet | null>(null)
  const { isGrouperView, changeGrouperView } = useContext(NavContext)

  const { data: session } = useSession() as unknown as { data: VSMSession }
  const enableEditing = programAndGrouperData?.program?.status === 'draft' && can(session, 'edit')

  const handleToggleUpdateData = () => {
    setToggleUpdateData((t) => !t)
  }

  useEffect(() => {
    const isGrouperValueSet = currentValueSet?.compose?.include?.[0]?.valueSet?.[0] != null
    changeGrouperView(isGrouperValueSet)
  }, [currentValueSet, changeGrouperView])

  useEffect(() => {
    const fetchValueSet = async () => {
      const response = await fetch(`/api/valueset?id=${router.query.valuesetId}`)
      const json = await response.json()
      setCurrentValueSet(json)
    }
    if (router.query.valuesetId) {
      fetchValueSet()
    }
  }, [router.query.valuesetId, toggleUpdateData])
  if (!currentValueSet || programAndGrouperDataLoading) {
    return <LoadingIndicator />
  }

  return (
    <ValueSetContents
      setToggleUpdateData={handleToggleUpdateData}
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
