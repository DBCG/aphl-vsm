import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { is } from '@/helpers/is' 

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

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

const parseValueSets = (valueSets: ValueSet[] | BundleEntryItem[] | undefined, activeSearchType: string | null): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs) => {
    let valueSetResource = is.valueSet(vs) ? vs : vs.resource

    const { id, name, publisher, url } = valueSetResource as ValueSet
    return {
      name,
      steward: publisher,
      oid: id,
      url: is.valueSet(vs) ? url : vs.fullUrl,
      version: valueSetResource.version,
      id: `${id}-version${valueSetResource.version}`
    }
  })

  return data
}

interface Input {
  valueSets: ValueSet[] | BundleEntryItem[],
  activeSearchType: 'error' | 'oid' | 'name',
  setSelectedValueSets: () => void
}

const SearchTable = ({
  valueSets = [],
  activeSearchType,
  setSelectedValueSets
}: Input) => {
  const tableData = parseValueSets(valueSets, activeSearchType)

  return (
    <DataTable
      columns={columns}
      data={tableData}
      selectableRows
      pagination
      paginationPerPage={10}
      onSelectedRowsChange={(e) => {
        console.log(e.selectedRows)
        setSelectedValueSets(e.selectedRows)
      }
      }
    />
  )
}

export { SearchTable }