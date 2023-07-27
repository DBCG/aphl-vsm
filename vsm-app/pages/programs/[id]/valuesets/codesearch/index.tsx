import { useRouter } from 'next/router'
import CodeSearch from '@/components/CodeSearch'

const CodeSearchPage = () => {
  const router = useRouter()
  const programId = router.query.id as string

  return <CodeSearch programId={programId} router={router} />
}

export default CodeSearchPage