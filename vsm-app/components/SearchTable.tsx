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

interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

const parseValueSets = (valueSets: ValueSet[] | BundleEntryItem[], activeSearchType: string | null): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs) => {
    let valueSetResource = vs.resource || vs

    const { id, name, publisher, url } = valueSetResource as ValueSet
    return {
      name,
      steward: publisher,
      oid: id,
      url: activeSearchType === 'oid' ? url : vs.fullUrl
    }
  })

  return data
}

const SearchTable = ({
  valueSets = [],
  activeSearchType
}: { valueSets: ValueSet[] | undefined }) => {
  const tableData = parseValueSets(valueSets, activeSearchType)

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