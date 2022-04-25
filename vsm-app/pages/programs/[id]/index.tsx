import React from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails, Result } from '@/hooks/useGetProgramDetails'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { is } from '@/helpers/is'

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  &.inputs {
    gap: 24px;
    margin-bottom: 16px;
  }
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ProgramDetails: NextPage = () => {
  const router = useRouter()
  const identifier = router.query.id as string
  console.log('identifier: ', identifier)
  const programAndGrouperInfo = useGetProgramDetails(identifier) as Result
  
  // early return if no data, id must exist if there's data
  // @ts-expect-error
  if (!is.library(programAndGrouperInfo.program)) {
    return null
  }

  const {
    id='', name='', version='', title='', description=''
  } = programAndGrouperInfo?.program

  const onClick = () => {
    router.push(`/programs/${id}/valuesets`)
  }

  return (
    <Col>
      <Row style={{ justifyContent: 'space-between' }}>
      <PageTitle>Program Detail Page</PageTitle>
      </Row>
      <Row className='inputs'>
        <SearchInput id='prog-id' label='ID' placeholder={id} />
        <SearchInput id='prog-name' label='Name' minWidth={400} placeholder={name} />
        <SearchInput id='prog-version' label='Version' placeholder={version} />
        <SearchInput id='prog-title' label='Title' placeholder={title} />
        <TextArea id='prog-desc' label='Description' minWidth={500} placeholder={description} />
      </Row>
      <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
        <span>Groups</span>
        <Button text='Edit ValueSets'
          onClick={onClick}
        />
      </Row>
      <ProgramDetailTable data={programAndGrouperInfo?.grouperData}/>
    </Col>
  )
}

export default ProgramDetails
