import React, { useMemo, useState, ChangeEvent } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { IconButton } from '@/components/buttons/IconButton'
import { FieldTitle, FieldValue, ItemWrapper } from '..'

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Col = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`

const Ul = styled.ul`
  padding-left: 16px;
`

const SearchOptions = styled.div`
  max-width: 500px;
  display: flex;
  flex-direction: column;
  margin-top: 30px;
  // border: 2px solid var(--theme-500);
  // border-bottom: none;
  padding: 8px 12px;
`

const TextInputContainer = styled.div`
  max-width: 250px;
  display: inline-block;
`

const StyledSelect = styled.select`
  height: 30px;
  min-width: 100px;
  margin-left: 8px;
  transform: translateY(4px);
  border-radius: none;
  border: none;
`

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const identifier = router.query.id as string
  const [findInVsName, setFindInVsName] = useState('')
  const progValueSetDets = useGetProgramValueSetDetails(identifier, findInVsName)

  const onClick = () => {
    router.push('/valuesets')
  }
    const columns = useMemo(() => [
    {
      name: 'Name',
      selector: (row: fhir4.Library) => row.title,
      sortable: true,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: fhir4.Library) => row.version,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'Conditions',
      selector: (row: fhir4.Library) => row.conditions,
      sortable: true,
      maxWidth: '300px',
      wrap: true,
      cell: (row: fhir4.Library) => (
        <Col>
          <Ul>
            {row?.conditions?.map(c => <li key={c?.display}>{c?.display}</li>)}
          </Ul>
        </Col>
      )
    },
    {
      name: 'Groups',
      selector: (row: fhir4.Library) => row.groups,
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      cell: (row: fhir4.Library) => (
        <Col>
          <Ul>
            {row?.groups?.map(g => <li key={g?.title}>{g?.title}</li>)}
          </Ul>
        </Col>
      )
      
    },
    {
      name: 'Remove ValueSet',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      maxWidth: '150px',
      cell: (row: fhir4.Library) => (
        <IconButton
          onClick={() => router.push(`/programs/${row.id}`)}
          type='delete'
          style={{ backgroundColor: 'darkRed' }}
        />
      )
    }
  ], [router])

  return (
    <>
      <Row>
        <PageTitle>Program ValueSet Details</PageTitle>
        <Button style={{ marginTop: '12px' }} text='Add New ValueSet'
          onClick={onClick}
        />
      </Row>
      <ItemWrapper style={{ marginBottom: '12px'}}>
        <FieldTitle>ID</FieldTitle>
        <FieldValue>{ identifier }</FieldValue>
      </ItemWrapper>
      <SearchOptions>
        <p>Filters</p>
        <div>
          <TextInputContainer>
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFindInVsName(e.target.value)}
              label='ValueSet Name'
              id='VSearch'
              style={{
                marginBottom: '12px',
                display: 'inline-block'
              }}
            />
          </TextInputContainer>
          <StyledSelect id='groups'>
            <option>Groups</option>
          </StyledSelect>
          <StyledSelect id='conditions'>
            <option>Conditions</option>
          </StyledSelect>

        </div>
      </SearchOptions>
      <DT
        data={progValueSetDets}
        columns={columns}
        theme='aphl'
        pagination
        fixedHeader
        customStyles={customStyles}
      />
    </>
  )
}

export default ProgramValueSetDetails
