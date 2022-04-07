import type { NextPage } from 'next'
import styled from 'styled-components'
import { PageTitle } from '../../../components/Typography'
import { SearchInput } from '../../../components/SearchInput'
import { Button } from '../../../components/buttons/Button'
import React from 'react'

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ProgramDetails: NextPage = () => {
  return (
    <Col>
      <PageTitle>Program Detail Page</PageTitle>
      <Row>
        <SearchInput placeholder='ID' />
        <SearchInput placeholder='Name' />
        <SearchInput placeholder='Version' />
        <SearchInput placeholder='Title' />
        <SearchInput placeholder='Description' />
        <Button onClick={(e: React.MouseEvent) => console.log(e)} text='Add New Program' />
      </Row>
    </Col>
  )
}

export default ProgramDetails
