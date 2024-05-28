import { useRouter } from 'next/router'
import styled from 'styled-components'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import 'react-toastify/dist/ReactToastify.min.css'
import { PageTitle } from '@/components/Typography'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { Col } from '@/styles'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import LoadingIndicator from '@/components/LoadingIndicator'
import { useState } from 'react'

const DescriptionText = styled.p`
  color: var(--theme-500);
  line-height: 160%;
  margin-bottom: 24px;
`

const LinkText = styled.a`
  text-decoration: underline;
  cursor: pointer;
`

const ProvisionalVSSearch = () => {
  return (
    <div>
      test
    </div>
  )
}

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const fetchedProgram = useGetProgramById({ programId })
  const [ctx, setCtx] = useState('terminologyServer')

  // Check if program is active, if so, redirect to valuesets page
  if (fetchedProgram == null) {
    return <LoadingIndicator />
  } else if (fetchedProgram?.status === 'active') {
    router.push(`/programs/${programId}/valuesets`)
    return null
  }

  const handleContextChange = (
    event: React.MouseEvent<HTMLElement>,
    context: 'terminologyServer' | 'vsmProvisional'
  ) => {
    setCtx(context)
  }

  return (
    <Col>
      <PageTitle>Add ValueSets: {programId}</PageTitle>
      <DescriptionText>
        Value Sets added here will default to the most recent version available.
        <br />
        After adding a value set to the program from a terminology server, you may specify a different version on{' '}
        <LinkText href={`/programs/${programId}/valuesets`}>this page</LinkText>.
      </DescriptionText>
      <ValueSetSearchTable tableContext='search-page' />
    </Col>
  )
}

export default ValueSets
