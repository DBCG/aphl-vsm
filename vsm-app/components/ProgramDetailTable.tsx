import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'

const columns = [
  { name: 'Name', selector: (row: TableData) => row.name! },
  { name: 'Title', selector: (row: TableData) => row.title! },
  { name: 'URL', selector: (row: TableData) => row.url! }
]

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
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