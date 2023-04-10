import { useRouter } from 'next/router'
import ProgramValueSetDetails from '@/components/ProgramValueSetDetails'

const ProgramIDValuesetsPage = () => {
  const router = useRouter()
  const programId = router.query.id as string

  return <ProgramValueSetDetails programId={programId} />
}

export default ProgramIDValuesetsPage
