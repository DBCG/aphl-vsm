import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ValueSetContents from '@/components/ValueSetContents'
import LoadingIndicator from '@/components/LoadingIndicator'

const ValueSetPageView = () => {
  const router = useRouter()
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string)
  const [currentValueSet, setCurrentValueSet] = useState<fhir4.ValueSet | null>()

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
      program={programAndGrouperInfo?.program as fhir4.Library}
      grouperLibrary={programAndGrouperInfo?.grouperLibrary as fhir4.Library}
      valueSet={currentValueSet}
    />
  )
}

export default ValueSetPageView
