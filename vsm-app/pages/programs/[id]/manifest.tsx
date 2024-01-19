import EditManifestDetails from '@/components/EditManifestDetails'
import LoadingIndicator from '@/components/LoadingIndicator'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { useRouter } from 'next/router'
import { Row } from '@/styles'
import { Button } from '@/components/buttons/Button'

const ManifestPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const program = useGetProgramById({ programId })

  if (program?.status === 'active') {
    router.push(`/programs/${programId}`)
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

export default ManifestPage
