import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
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
  keywords: string[] | []
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

interface PropagationProp {
  children: ReactNode
}

const PropagationStopper = ({ children }: PropagationProp) => {
  return (
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  )
}

const parseValueSets = (valueSets: ValueSet[] | undefined): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs: fhir4.ValueSet) => {
    const { id, name, publisher, url, status, meta, date, version } = vs
    let updatedDate
    if (meta?.lastUpdated || date) {
      updatedDate = formatValuesetDate({ valueSet: vs, dateType: 'lastUpdated' }) || 'Unknown'
    } else {
      updatedDate = 'Unknown'
    }

    const keywords = vs?.extension
      ?.filter((ext) => ext.url.endsWith('/valueset-keyWord'))
      ?.map(xt => xt.valueString).filter(x => x) || []

    return {
      name,
      steward: publisher,
      lastUpdated: updatedDate,
      oid: id,
      url: url,
      version: version,
      id: `${id}-version${version}`,
      keywords: keywords as string[] | []
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
  setFindInKeyword: (eventItem: any) => void,
  handlePageChange: (eventItem: any) => void,
  handlePerRowsChange: (eventItem: any) => void,
  handleSort: (eventItem: any) => void,
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
  setFindInStatus,
  setFindInSteward,
  setFindInOid,
  setFindInLastUpdated,
  setFindInVersion,
  setFindInKeyword,
  isLoading=false,
  showFilters,
  handlePageChange,
  handlePerRowsChange,
  paginationTotalRows,
  searchType,
  resultsPerPage,
  handleSort
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
    },
    {
      name: (
        <div>
        <SelectInputTitle>Keyword</SelectInputTitle>
          { showFilters && (
            <FilterInput
              onChange={(e: React.ChangeEvent<Element>) => {
                const target = e.target as HTMLInputElement
                setFindInKeyword(target.value.trim())
              }}
              style={{
                height: '30px'
              }}
            />
          )}
        </div>
      ),
      wrap: true,
      
      selector: (row: TableData) => row?.keywords?.join(', ') 
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
      sortServer={searchType == 'name' && resultsPerPage > paginationTotalRows}
      onSort={handleSort}
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
      // sorting
      
    />
  )
}

export { SearchTable }