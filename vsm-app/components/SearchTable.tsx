import { BundleEntry, ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'

const columns = [
  { name: 'Name', selector: (row: TableData) => row.name! },
  { name: 'Steward', selector: (row: TableData) => row.steward! },
  { name: 'OID', selector: (row: TableData) => row.oid! }
]

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  oid: ValueSet['id']
}

const parseValueSet = (valueSets: ValueSet[]): TableData[] => {
  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs) => {
    const { id, name, publisher, url } = vs as ValueSet
    return {
      name,
      steward: publisher,
      oid: id,
      url: url
    }
  })

  return data
}

const SearchTable = ({ valueSets = [] }:{ valueSets: ValueSet[] | undefined }) => {
  const tableData = parseValueSet(valueSets)

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

export { SearchTable }