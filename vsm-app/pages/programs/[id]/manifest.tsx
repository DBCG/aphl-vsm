
import EditManifestDetails from '@/components/EditManifestDetails'
import { useRouter } from 'next/router'
import { Row } from '@/styles'
import { Button } from '@/components/buttons/Button'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const ManifestPage = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()

  if (program?.status === 'active') {
    router.push(`/programs/${program?.id}`)
    return null
  }


  return (
    <>
      <Row style={{ marginBottom: '1.5rem' }}>
        <Button id="back-to-program" text="&#8592; Back to program" onClick={() => router.push(`/programs/${program?.id}`)} />
      </Row>
      <EditManifestDetails program={program} />
    </>
  )
}

export default ManifestPage
