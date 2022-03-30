import type { NextPage } from 'next'
import styled from 'styled-components'
import { useMemo, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import DT, { TableColumn } from 'react-data-table-component'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/buttons/Button'
import { useGetPrograms } from '../../hooks/useGetPrograms'
import { IconButton } from '../../components/buttons/IconButton'

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

interface DTProps {
  data: fhir4.Library[];
  columns: TableColumn<fhir4.Library[]>[];
}

const StyledDT = styled(DT)<DTProps>`
`

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Programs: NextPage = () => {
  const programs = useGetPrograms()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPrograms = (): fhir4.Library[] => {
    if (searchTerm === '') return programs
    return programs.filter(p => {
      return (
      p?.id?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      p?.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      p?.description?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      p?.title?.toLowerCase().includes(searchTerm?.toLowerCase())
    )})
  }

  const columns = useMemo(() => [
    {
      name: 'Updated',
      selector: (row: fhir4.Library) => row.date,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'ID',
      selector: (row: fhir4.Library) => row.id,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'Name',
      selector: (row: fhir4.Library) => row.name,
      sortable: true,
      maxWidth: '300px',
      wrap: true
    },
    {
      name: 'Title',
      selector: (row: fhir4.Library) => row.title,
      sortable: true,
      maxWidth: '200px',
      wrap: true
    },
    {
      name: 'Description',
      selector: (row: fhir4.Library) => row.description,
      sortable: false,
      maxWidth: '300px',
      minWidth: '300px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: fhir4.Library) => row.version,
      sortable: true,
      wrap: true
    },
    {
      name: 'Edit',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      cell: (row: fhir4.Library) => (
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
          data={filteredPrograms()}
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
