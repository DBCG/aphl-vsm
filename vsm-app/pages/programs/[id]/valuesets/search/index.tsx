import { useRouter } from 'next/router'
import styled from 'styled-components'
import { PageTitle } from '@/components/Typography'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { Col } from '@/styles'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const DescriptionText = styled.p`
  color: var(--theme-500);
  line-height: 160%;
  margin-bottom: 48px;
`

const LinkText = styled.a`
  text-decoration: underline;
  cursor: pointer;
`

const ValueSets = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()

  if (program?.status === 'active') {
    router.push(`/programs/${program?.id}/valuesets`)
  }

  return (
    <Col>
      <PageTitle>Add ValueSets: {program?.id}</PageTitle>
      <DescriptionText>
        Valuesets added here will default to the most recent version available.
        <br />
        After adding a valueset to the program, you may specify a different version on{' '}
        <LinkText href={`/programs/${program?.id}/valuesets`}>this page</LinkText>.
      </DescriptionText>
      <ValueSetSearchTable tableContext="search-page" />
    </Col>
  )
}

export default ValueSets
