import { BundleEntry, ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'

const columns = [
  { name: 'Name', selector: row => row.name },
  { name: 'Steward', selector: row => row.steward },
  { name: 'OID', selector: row => row.oid }
]

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  oid: ValueSet['id']
}

const parseValueSet = (valueSets: BundleEntry[]): TableData[] => {
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

const SearchTable = ({ valueSets = [] }:{ valueSets: BundleEntry[] | undefined }) => {
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