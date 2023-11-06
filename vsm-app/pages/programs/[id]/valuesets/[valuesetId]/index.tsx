import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useContext } from 'react'
import ValueSetContents from '@/components/ValueSetContents'
import LoadingIndicator from '@/components/LoadingIndicator'
import { VSMSession, allowEditing } from '@/helpers/rolesHelper'
import { NavContext } from '@/components/NavBar'

const ValueSetPageView = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const valueSetId = router.query.valuesetId as string
  const [toggleUpdateData, setToggleUpdateData] = useState(false)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId, toggleRefresh: toggleUpdateData })
  const [currentValueSet, setCurrentValueSet] = useState<fhir4.ValueSet | null>(null)
  const { isGrouperView, changeGrouperView } = useContext(NavContext)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const enableEditing = allowEditing({ session, programStatus: programAndGrouperData?.program?.status })

  const handleToggleUpdateData = () => {
    setToggleUpdateData((t) => !t)
  }

  useEffect(() => {
    const fetchValueSet = async () => {
      const response = await fetch(`/api/valueset?id=${valueSetId}`)
      const json = await response.json()
      setCurrentValueSet(json)
    }

    if (!programAndGrouperDataLoading && valueSetId) {
      const grouperValueSet = programAndGrouperData?.grouperData?.find((gl) => gl.id === valueSetId)
      changeGrouperView(grouperValueSet != null)
      fetchValueSet()
    }
  }, [valueSetId, toggleUpdateData, programAndGrouperDataLoading, changeGrouperView, programAndGrouperData?.grouperData])

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
