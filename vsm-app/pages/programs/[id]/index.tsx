import React from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { PageTitle } from '../../../components/Typography'
import { SearchInput } from '../../../components/SearchInput'
import { TextArea } from '../../../components/TextArea'
import { Button } from '../../../components/buttons/Button'
import { useGetProgramById } from '../../../hooks/useGetProgramById'

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
  const program = useGetProgramById(identifier)
  if(!program.length) return null
  
  console.log('program: ', program)
  const {
    id='', name='', version='', title='', description=''
  } = program[0]

  console.log('program: ', program)
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
    </Col>
  )
}

export default ProgramDetails
