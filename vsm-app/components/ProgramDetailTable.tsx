import { BundleEntry, ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'

const columns = [
  { name: 'ID', selector: (row: TableData) => row.id! },
  { name: 'Title', selector: (row: TableData) => row.title! },
  { name: 'Canonical', selector: (row: TableData) => row.canonical! },
  { name: 'Actions', selector: (row: TableData) => row.oid! }
]

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  oid: ValueSet['id']
}

const parseValueSets = (valueSets: BundleEntry[]): TableData[] => {
  if (!valueSets || valueSets.length < 1) { return [] }

  const data =  valueSets.map(({ resource }) => {
    const { id, name, publisher } = resource as ValueSet
    return {
      name,
      steward: publisher,
      oid: id
    }
  })

  return data
}

const ProgramDetailTable = ({ valueSets = [] }:{ valueSets: BundleEntry[] | undefined }) => {
  const tableData = parseValueSets(valueSets)

  return (
    <DataTable
      columns={columns}
      data={tableData}
      selectableRows
      pagination
      paginationPerPage={10}
    />
  )
}

export { ProgramDetailTable }