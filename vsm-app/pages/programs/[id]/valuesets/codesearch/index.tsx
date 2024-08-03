import { useRouter } from 'next/router'
import CodeSearch from '@/components/CodeSearch'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const CodeSearchPage = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()

  return <CodeSearch program={program} router={router} />
}

export default CodeSearchPage