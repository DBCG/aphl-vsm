import { useRouter } from 'next/router'
import styled from 'styled-components'
import 'react-toastify/dist/ReactToastify.min.css'
import { PageTitle } from '@/components/Typography'
import { getSession, GetSessionParams } from 'next-auth/react'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'

const DescriptionText = styled.p`
  color: var(--theme-500);
  line-height: 160%;
  margin-bottom: 48px;
`

const LinkText = styled.a`
  text-decoration: underline;
  cursor: pointer;
`

interface SubmitProps {
  hide: boolean
}

export const SubmitSelectedForm = styled.form<SubmitProps>`
  padding: 12px 18px;
  background-color: var(--theme-100);
  max-height: ${(props) => (props.hide ? '0' : '1000px')};
  padding: ${(props) => (props.hide ? '0' : 'auto')};
  transition: all 0.3s;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  return (
    <Col>
      <PageTitle>Add ValueSets: {programId}</PageTitle>
      <DescriptionText>
        Valuesets added here will default to the most recent version available.
        <br />
        After adding a valueset to the program, you may specify a different version on{' '}
        <LinkText href={`/programs/${programId}/valuesets`}>this page</LinkText>.
      </DescriptionText>
      <ValueSetSearchTable tableContext="search-page" />
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false
      }
    }
  }

  return {
    props: { session }
  }
}

export default ValueSets
