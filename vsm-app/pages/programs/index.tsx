import type { NextPage } from 'next'
import { useMemo } from 'react'
import { createTheme } from 'react-data-table-component'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'
import { useGetPrograms } from '../../hooks/useGetPrograms'
import DT from 'react-data-table-component'
import { DataTable } from '../../components/tables/DataTable'

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

createTheme('aphl', {
  cells: {
    style: {
      paddingTop: '24px',
      paddingBottom: '24px'
    }
  }
  // text: {
  //   primary: '#268bd2',
  //   secondary: '#2aa198',
  // },
  // background: {
  //   default: '#002b36',
  // },
  // context: {
  //   background: '#cb4b16',
  //   text: '#FFFFFF',
  // },
  // divider: {
  //   default: '#073642',
  // },
  // action: {
  //   button: 'rgba(0,0,0,.54)',
  //   hover: 'rgba(0,0,0,.08)',
  //   disabled: 'rgba(0,0,0,.12)',
  // },
}, 'light')

const Programs: NextPage = () => {
  const programs = useGetPrograms()
  console.log('PROG', programs)
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
      sortable: true,
      wrap: true
    }
  ], [])

  console.log('columns: ', columns)

  return (
    <Col>
      <PageTitle>Programs</PageTitle>
      <Row>
        <SearchInput placeholder='Search by ID, Name, Title' />
        <Button text='Add New Program' />
      </Row>
        <StyledDT
          data={programs}
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
