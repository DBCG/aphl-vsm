import EditManifestDetails from '@/components/EditManifestDetails'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const VSPManifest = ({ program }: LibraryServerSideProps) => {
  return <EditManifestDetails program={program} />
}

export default VSPManifest
