import { useMemo } from 'react'
import styled from 'styled-components'
import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
  version: ValueSet['version']
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

const ProgramDetailTable = ({ data }: any) => {

  // can only delete grouper if has editing permissions
  // deleting the grouper removes it from the grouper library
  const deleteGrouper = () => {
    
  }

  const columns = useMemo(() => [
      {
    name: 'Name',
    selector: (row: TableData) => row.name!,
    sortable: true,
    wrap: true
  },
  {
    name: 'Title',
    selector: (row: TableData) => row.title!,
    sortable: true,
    wrap: true
  },
  { 
    name: 'URL',
    selector: (row: TableData) => row.url!,
    wrap: true
  },
  {
    name: 'Version',
    selector: (row: TableData) => row.version!,
    sortable: true,
    wrap: true,
    maxWidth: '150px'
  },
  {
    name: 'Remove Group',
    maxWidth: '150px',
    center: true,
    cell: (row) => (
      <ButtonContainer>
        <IconButton
          onClick={async () => {
            // await handleDelete({
            //   vsCanonical: row?.valueSet?.url,
            //   grouperCanonicals: row.groups.map(g => g.url)
            // })
            window.location.reload()
          }}
          buttonContext='delete'
          style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
        />
      </ButtonContainer>
    )
  }
  ], [data])

  return (
    <DataTable
      columns={columns}
      data={data}
      pagination
      paginationPerPage={10}
    />
  )
}

export { ProgramDetailTable }