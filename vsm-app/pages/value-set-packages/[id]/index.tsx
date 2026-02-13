import VSPDetails from '@/components/VSPDetails'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const VSPDetailsPage = ({ program }: LibraryServerSideProps) => {
  return <VSPDetails program={program} />
}

export default VSPDetailsPage
