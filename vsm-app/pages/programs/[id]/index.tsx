import ProgramDetails from '@/components/ProgramDetails'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const ProgramDetailsPage = ({ program }: LibraryServerSideProps) => {
  return <ProgramDetails program={program} />
}

export default ProgramDetailsPage
