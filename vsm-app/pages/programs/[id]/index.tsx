import React from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { PageTitle } from '../../../components/Typography'
import { SearchInput } from '../../../components/SearchInput'
import { TextArea } from '../../../components/TextArea'
import { Button } from '../../../components/buttons/Button'
import { useGetProgramDetails } from '../../../hooks/useGetProgramDetails'
import { ProgramDetailTable } from '../../../components/ProgramDetailTable'

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  &.inputs {
    gap: 24px;
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
  const identifier = router.query.id
  const programAndGrouperInfo = useGetProgramDetails(identifier)
  console.log(programAndGrouperInfo)
  
  let programId = programAndGrouperInfo?.program?.[0]?.id
  // early return if no data, id must exist if there's data
  if (!programId) {
    return null
  }  
  
  console.log('DATA: ', programAndGrouperInfo);
  
  
  const {
    id='', name='', version='', title='', description=''
  } = programAndGrouperInfo?.program?.[0]

  return (
    <Col>
      <Row style={{ justifyContent: 'space-between' }}>
      <PageTitle>Program Detail Page</PageTitle>
        <Button style={{ marginBottom: '24px' }} onClick={(e: React.MouseEvent) => console.log(e)} text='Add New Program' />
      </Row>
      <Row className='inputs'>
        <SearchInput id='prog-id' label='ID' placeholder={id} />
        <SearchInput id='prog-name' label='Name' minWidth={400} placeholder={name} />
        <SearchInput id='prog-version' label='Version' placeholder={version} />
        <SearchInput id='prog-title' label='Title' placeholder={title} />
        <TextArea id='prog-desc' label='Description' minWidth={500} placeholder={description} />
      </Row>
      <ProgramDetailTable data={programAndGrouperInfo?.grouperData}/>
    </Col>
  )
}

export default ProgramDetails
