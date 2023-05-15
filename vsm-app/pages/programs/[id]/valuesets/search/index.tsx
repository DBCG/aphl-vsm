import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import styled from 'styled-components'
import 'react-toastify/dist/ReactToastify.min.css'
import { PageTitle } from '@/components/Typography'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { Col } from '@/styles'

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

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  return (
    <Col>
      <Button text="&#8592; Back to valueset list" style={{ width: 'fit-content' }} onClick={() => router.push(`/programs/${programId}/valuesets`)} />
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

export default ValueSets
