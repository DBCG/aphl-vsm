import { useRouter } from 'next/router'
import ProgramValueSetDetails from '@/components/ProgramValueSetDetails'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from '@/utils/getLibraryServerSideProp'

const ProgramIDValuesetsPage = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()

  return <ProgramValueSetDetails program={program} router={router} />
}

export default ProgramIDValuesetsPage
