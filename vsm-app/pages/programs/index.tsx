import type { NextPage } from 'next'
import { useMemo, useState, ChangeEvent } from 'react'
import { createTheme } from 'react-data-table-component'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/buttons/Button'
import { useGetPrograms } from '../../hooks/useGetPrograms'
import DT from 'react-data-table-component'
import { DataTable } from '../../components/tables/DataTable'
import { IconButton } from '../../components/buttons/IconButton'
import { useRouter } from 'next/router'

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const StyledDT = styled(DT)`

`

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const filterPrograms = (programs, query): boolean => {
  if (query === '') return programs
  return programs.filter(p => {
    return (
    p?.id?.toLowerCase().includes(query?.toLowerCase()) ||
    p?.name?.toLowerCase().includes(query?.toLowerCase()) ||
    p?.description?.toLowerCase().includes(query?.toLowerCase()) ||
    p?.title?.toLowerCase().includes(query?.toLowerCase())
  )})
}

const Programs: NextPage = () => {
  const programs = useGetPrograms()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const columns = useMemo(() => [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'Name',
      selector: row => row.name,
      sortable: true,
      maxWidth: '300px',
      wrap: true
    },
    {
      name: 'Title',
      selector: row => row.title,
      sortable: true,
      maxWidth: '200px',
      wrap: true
    },
    {
      name: 'Description',
      selector: row => row.description,
      sortable: false,
      maxWidth: '300px',
      minWidth: '300px',
      wrap: true
    },
    {
      name: 'Version',
      selector: row => row.version,
      sortable: true,
      wrap: true
    },
    {
      name: 'Edit',
      selector: row => row.name,
      sortable: false,
      wrap: true,
      cell: row => (
        <IconButton
          onClick={() => router.push(`/programs/${row.id}`)}
          type='edit'
        />
      )
    }
  ], [])

  const onClick = () => {
    router.push('/programs/new')
  }

  return (
    <Col>
      <Row>
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          id='program-search'
          label='Search by ID, Name, Title, Description'
          hasIcon={true}
          minWidth={400}
        />
        <Button text='Add New Program'
          onClick={onClick}
        />
      </Row>
        <StyledDT
          data={filterPrograms(programs, searchTerm)}
          columns={columns}
          theme='aphl'
          pagination
          fixedHeader
          customStyles={customStyles}
        />
    </Col>
  )
}

export default Programs
