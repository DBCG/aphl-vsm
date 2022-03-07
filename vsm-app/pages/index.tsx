import type { NextPage } from 'next'
import styled from 'styled-components'
import { PageTitle } from '../components/Typography'
import { SearchInput } from '../components/SearchInput'
import { Button } from '../components/Button'

const Row = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  justify-content: space-between;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const Programs: NextPage = () => {
  return (
    <Col>
      <PageTitle>Programs</PageTitle>
      <Row>
        <SearchInput placeholder='Search by ID, Name, Title' />
        <Button text='Add New Program'/>
      </Row>
    </Col>
  )
}

export default Programs
