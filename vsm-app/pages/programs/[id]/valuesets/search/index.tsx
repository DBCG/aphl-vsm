import { useRouter } from 'next/router'
import styled from 'styled-components'
import 'react-toastify/dist/ReactToastify.min.css'
import { PageTitle } from '@/components/Typography'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { Col } from '@/styles'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import LoadingIndicator from '@/components/LoadingIndicator'

const DescriptionText = styled.p`
  color: var(--theme-500);
  line-height: 160%;
  margin-bottom: 48px;
`

const LinkText = styled.a`
  text-decoration: underline;
  cursor: pointer;
`

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const fetchedProgram = useGetProgramById({ programId })

  // Check if program is active, if so, redirect to valuesets page
  if (fetchedProgram == null) {
    return <LoadingIndicator />
  } else if (fetchedProgram?.status === 'active') {
    router.push(`/programs/${programId}/valuesets`)
    return null
  }

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

export default ValueSets
