
import EditManifestDetails from '@/components/EditManifestDetails'
import LoadingIndicator from '@/components/LoadingIndicator'
import { useRouter } from 'next/router'
import { Row } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { getLibraryServerSide, LibraryServerSideProps } from '@/utils/getLibraryServerSide'

const ManifestPage = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()

  if (program?.status === 'active') {
    router.push(`/programs/${program?.id}`)
    return null
  }

  if (program == null) {
    return <LoadingIndicator />
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

export const getServerSideProps = getLibraryServerSide(async ({ program }: LibraryServerSideProps) => {
  return {
    props: {
      program
    }
  }
})


export default ManifestPage
