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

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Programs: NextPage = () => {
  const router = useRouter()
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')

  console.log('searchTermName: ', searchTermName)
  const programs = useGetPrograms({
    id: searchTermID,
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription
  })
  

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
  ], [router])

  const onClick = () => {
    router.push('/programs/new')
  }
  // commenting out the ID search input
  // because cannot partial-string-search on field
  return (
    <Col>
      <Row>
        {/* <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermID(e.target.value)}
          id='program-search-id'
          label='Search by ID'
          hasIcon={true}
          minWidth={400}
        /> */}
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermName(e.target.value)}
          id='program-search-name'
          label='Search by Name'
          hasIcon={true}
          minWidth={400}
        />
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermTitle(e.target.value)}
          id='program-search-title'
          label='Search by Title'
          hasIcon={true}
          minWidth={400}
        />
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setSearchTermDescription(e.target.value)
          }}
          id='program-search-description'
          label='Search by Description'
          hasIcon={true}
          minWidth={400}
        />
        <Button style={{ marginTop: '12px' }} text='Add New Program'
          onClick={onClick}
        />
      </Row>
      <DT
        data={programs}
        // @ts-expect-error
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
