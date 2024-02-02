import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { FilterInput } from './FilterInput'
import LoadingIndicator from './LoadingIndicator'
import { SelectInputTitle } from '@/components/ProgramValueSetDetails/styles'
import { formatValuesetDate } from '@/helpers/formatDates'
import { TableContextType } from './ValueSetSearchTable'
import { customTableStyles } from './tables/themes'

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  lastUpdated: string
  oid: ValueSet['id']
  url: ValueSet['url']
  version: ValueSet['version']
  id: ValueSet['id']
  status: ValueSet['status']
  valueSet: fhir4.ValueSet
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

const parseValueSets = (valueSets: ValueSet[] | undefined): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) {
    return []
  }

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
      status: status,
      lastUpdated: updatedDate,
      oid: id,
      url: url,
      version: version,
      id: id,
      valueSet: vs
    }
  })

  return data
}

interface Input {
  valueSets: ValueSet[] | undefined
  setSelectedValueSets: (eventItem: any) => void
  setClearSelectedRows: (eventItem: any) => void
  findInTitle: string
  setFindInTitle: (eventItem: any) => void
  findInSteward: string
  setFindInSteward: (eventItem: any) => void
  findInStatus: string
  setFindInStatus: (eventItem: any) => void
  findInOid: string
  setFindInOid: (eventItem: any) => void
  findInLastUpdated: string
  setFindInLastUpdated: (eventItem: any) => void
  findInVersion: string
  setFindInVersion: (eventItem: any) => void
  handlePageChange: (eventItem: any) => void
  handlePerRowsChange: (newPerPage: number, page: number) => void
  clearSelectedRows: boolean
  searchType: string
  paginationTotalRows: number
  isLoading: boolean
  showFilters: boolean
  resultsPerPage: number
  tableContext: TableContextType
}

const SearchTable = ({
  valueSets = [],
  setSelectedValueSets,
  findInTitle,
  setFindInTitle,
  findInSteward,
  setFindInSteward,
  findInOid,
  setFindInOid,
  findInLastUpdated,
  setFindInLastUpdated,
  findInVersion,
  setFindInVersion,
  isLoading = false,
  showFilters,
  handlePageChange,
  handlePerRowsChange,
  paginationTotalRows,
  searchType,
  clearSelectedRows,
  setClearSelectedRows,
  resultsPerPage,
  tableContext
}: Input) => {
  const tableData = parseValueSets(valueSets)

  const columns = [
    {
      name: (
        <div>
          <SelectInputTitle>Title</SelectInputTitle>
          {showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInTitle(target.value.trim())
              }}
              style={{ height: '30px' }}
              value={findInTitle}
            />
          )}
        </div>
      ),
      wrap: true,
      minWidth: '20rem',
      selector: (row: TableData) => row.valueSet.title!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      }
    },
    {
      name: (
        <div>
          <SelectInputTitle>{tableContext === 'search-page' && 'Latest'} Version</SelectInputTitle>
          {showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInVersion(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
              value={findInVersion}
            />
          )}
        </div>
      ),
      selector: (row: TableData) => row.version!,
      sortable: false,
      wrap: true,
      maxWidth: '10rem'
    },
    {
      name: (
        <div>
          <SelectInputTitle>Last Updated</SelectInputTitle>
          {showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInLastUpdated(target.value.trim())
              }}
              style={{ height: '30px' }}
              value={findInLastUpdated}
            />
          )}
        </div>
      ),
      sortable: false,
      wrap: true,
      maxWidth: '10rem',
      selector: (row: TableData) => row.lastUpdated!
    },
    {
      name: (
        <div>
          <SelectInputTitle>Steward</SelectInputTitle>
          {showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInSteward(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
              value={findInSteward}
            />
          )}
        </div>
      ),
      maxWidth: '15rem',
      selector: (row: TableData) => row.steward!,
      sortable: false,
      wrap: true
    },
    {
      name: (
        <div>
          <SelectInputTitle>ID</SelectInputTitle>
          {showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInOid(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
              value={findInOid}
            />
          )}
        </div>
      ),
      wrap: true,
      minWidth: '20rem',
      selector: (row: TableData) => row?.oid?.split?.('-')?.[0]! || ''
    }
  ]

  return (
    <DataTable
      persistTableHead={true}
      columns={columns}
      data={tableData}
      selectableRows
      pagination
      paginationServer={searchType == 'title'}
      paginationPerPage={resultsPerPage}
      progressPending={isLoading}
      progressComponent={<LoadingIndicator />}
      onSelectedRowsChange={(e) => {
        setSelectedValueSets(e.selectedRows)
        if (clearSelectedRows === true) {
          setClearSelectedRows(false)
        }
      }}
      // @ts-ignore-next-line
      customStyles={customTableStyles('readonly')}
      paginationTotalRows={paginationTotalRows}
      onChangePage={handlePageChange}
      onChangeRowsPerPage={handlePerRowsChange}
      clearSelectedRows={clearSelectedRows}
    />
  )
}

export { SearchTable }
