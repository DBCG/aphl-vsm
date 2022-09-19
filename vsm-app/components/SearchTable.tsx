import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { FilterInput } from './FilterInput'
import LoadingIndicator from './LoadingIndicator'
import { SelectInputTitle, customStyles, SelectInputContainer } from 'pages/programs/[id]/valuesets'
import { formatValuesetDate } from '@/helpers/formatDates'
import { ReactNode } from 'react'

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  lastUpdated: string
  oid: ValueSet['id']
  url: ValueSet['url']
  version: ValueSet['version']
  id: ValueSet['id']
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

interface PropagationProp {
  children: ReactNode
}

const parseValueSets = (valueSets: ValueSet[] | undefined): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  console.log('valuesets here: ', valueSets)

  const data = valueSets.map((vs: fhir4.ValueSet) => {
    const { id, name, publisher, url, status, meta, date, version } = vs
    let updatedDate
    if (meta?.lastUpdated || date) {
      updatedDate = formatValuesetDate({ valueSet: vs, dateType: 'lastUpdated' }) || 'Unknown'
    } else {
      updatedDate = 'Unknown'
    }

    return {
      name,
      steward: publisher,
      lastUpdated: updatedDate,
      oid: id,
      url: url,
      version: version,
      id: `${id}-version${version}`
    }
  })

  return data
}

interface Input {
  valueSets: ValueSet[] | undefined,
  setSelectedValueSets: (eventItem: any) => void,
  setFindInName: (eventItem: any) => void,
  setFindInSteward: (eventItem: any) => void,
  setFindInStatus: (eventItem: any) => void,
  setFindInOid: (eventItem: any) => void,
  setFindInLastUpdated: (eventItem: any) => void,
  setFindInVersion: (eventItem: any) => void,
  handlePageChange: (eventItem: any) => void,
  handlePerRowsChange: (eventItem: any) => void,
  searchType: string,
  paginationTotalRows: number,
  isLoading: boolean,
  showFilters: boolean,
  resultsPerPage: number
}

const vsStatuses = [
  'draft', 'active', 'retired', 'unknown'
]

const statusOptions = vsStatuses.map(s => ({
  value: s,
  label: s,
  id: s
}))

const SearchTable = ({
  valueSets = [],
  setSelectedValueSets,
  setFindInName,
  setFindInSteward,
  setFindInOid,
  setFindInLastUpdated,
  setFindInVersion,
  isLoading=false,
  showFilters,
  handlePageChange,
  handlePerRowsChange,
  paginationTotalRows,
  searchType,
  resultsPerPage,
}: Input) => {

  const tableData = parseValueSets(valueSets)

  const columns = [
    {
      name: (
        <div>
          <SelectInputTitle>Name</SelectInputTitle>
            { showFilters && (
              <FilterInput
                onChange={(e: React.ChangeEvent<Element>) => {
                  const target = e.target as HTMLInputElement
                  setFindInName(target.value.trim())
                }}
                style={{ height: '30px' }}
            />
            )}
        </div>
      ),
      wrap: true,
      selector: (row: TableData) => row.name!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      }
    },
    {
      name: (
        <div>
          <SelectInputTitle>Last Updated</SelectInputTitle>
            { showFilters && (
              <FilterInput
                onChange={(e: React.ChangeEvent<Element>) => {
                  const target = e.target as HTMLInputElement
                  setFindInLastUpdated(target.value.trim())
                }}
                style={{ height: '30px' }}
            />
            )}
        </div>
      ),
      sortable: false,
      wrap: true,
      selector: (row: TableData) => row.lastUpdated!
    },
    {
      name: (
        <div>
          <SelectInputTitle>Version</SelectInputTitle>
            { showFilters && (
              <FilterInput
                onChange={(e: React.ChangeEvent<Element>) => {
                  const target = e.target as HTMLInputElement
                  setFindInVersion(target.value.trim())
                }}
                style={{ height: '30px' }}
            />
            )}
        </div>
      ),
      wrap: true,
      selector: (row: TableData) => row.version!
    },
    {
      name: (
        <div>
        <SelectInputTitle>Steward</SelectInputTitle>
          { showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInSteward(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
            />
          )}
        </div>
      ),
      selector: (row: TableData) => row.steward!,
      sortable: false,
      wrap: true,
    },
    {
      name: (
        <div>
        <SelectInputTitle>OID</SelectInputTitle>
          { showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInOid(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
            />
          )}
        </div>
      ),
      wrap: true,
      selector: (row: TableData) => row?.oid?.split?.('|')?.[0]! || ''
    }
  ]

  return (
    <DataTable
      persistTableHead={true}
      columns={columns}
      data={tableData}
      selectableRows
      pagination
      paginationServer={searchType == 'name'}
      paginationPerPage={10}
      progressPending={isLoading}
      progressComponent={<LoadingIndicator/>}
      onSelectedRowsChange={(e) => {
        setSelectedValueSets(e.selectedRows)
      }}
      // @ts-ignore-next-line
      customStyles={customStyles}
      paginationTotalRows={paginationTotalRows}
      onChangePage={handlePageChange}
      onChangeRowsPerPage={handlePerRowsChange}
    />
  )
}

export { SearchTable }