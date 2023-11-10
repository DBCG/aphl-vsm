import { useRouter } from 'next/router'
import ProgramValueSetDetails from '@/components/ProgramValueSetDetails'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'

const ProgramIDValuesetsPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId })
  if (programAndGrouperDataLoading || programAndGrouperData?.program == null) { return null }
  return <ProgramValueSetDetails program={programAndGrouperData?.program} router={router} />
}

export default ProgramIDValuesetsPage
