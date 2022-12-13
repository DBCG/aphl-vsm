import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'

const columns = [
  {
    name: 'Name',
    selector: (row: TableData) => row.name!,
    wrap: true
  },
  {
    name: 'Title',
    selector: (row: TableData) => row.title!,
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
    wrap: true,
    maxWidth: '150px'
  }
]

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
  version: ValueSet['version']
}

const ProgramDetailTable = ({ data }: any) => {
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