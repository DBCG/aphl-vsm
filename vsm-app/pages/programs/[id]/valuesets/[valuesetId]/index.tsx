import { useGetProgramDetails } from "@/hooks/useGetProgramDetails"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import ValueSetContents from '@/components/ValueSetContents'

const ValueSetPageView =  () => {
  const router = useRouter();
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string) as Result
  const [currentValueSet, setCurrentValueSet] = useState<fhir4.ValueSet| null>()
  

  useEffect(() => {
    const fetchValueSet = async () => {
      const response = await fetch(`/api/valueset?id=${router.query.valuesetId}`)
      const json = await response.json()
      setCurrentValueSet(json)
    }
    fetchValueSet()
  }, [router.query.valuesetId])

  return (
    <ValueSetContents grouperLibrary={programAndGrouperInfo.grouperLibrary} valueSet={currentValueSet} />
    )
}

export default ValueSetPageView