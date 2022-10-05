import styled from 'styled-components'
import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { FilterInput } from './FilterInput'
import LoadingIndicator from './LoadingIndicator'
import { SelectInputTitle, customStyles } from 'pages/programs/[id]/valuesets'
import { formatValuesetDate } from '@/helpers/formatDates'

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  lastUpdated: string
  oid: ValueSet['id']
  url: ValueSet['url']
  version: ValueSet['version']
  id: ValueSet['id']
  status: ValueSet['status']
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

interface StatusProps {
  status: 'active' | 'draft' | 'retired' | 'unknown'
}

const StatusTag = styled.div<StatusProps>`
  padding: 4px 8px;
  border-radius: 8px;
  background-color: ${ props => props.status === 'draft' ? '#F4CB92' : props.status === 'active' ? 'var(--theme-200)' : '#F4CB92' };
  width: max-content;
  display: inline-block;
`

const StatusWarning = styled.p`
  color: var(--accent);
  font-size: 80%;
`

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
  valueSets: ValueSet[] | undefined,
  setSelectedValueSets: (eventItem: any) => void,
  setClearSelectedRows: (eventItem: any) => void,
  setFindInName: (eventItem: any) => void,
  setFindInSteward: (eventItem: any) => void,
  setFindInStatus: (eventItem: any) => void,
  setFindInOid: (eventItem: any) => void,
  setFindInLastUpdated: (eventItem: any) => void,
  setFindInVersion: (eventItem: any) => void,
  handlePageChange: (eventItem: any) => void,
  handlePerRowsChange: (eventItem: any) => void,
  clearSelectedRows: boolean,
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
  clearSelectedRows,
  setClearSelectedRows,
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
          <SelectInputTitle>Status</SelectInputTitle>
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
      selector: (row: TableData) => (row.status),
      cell : (row: TableData) => {
        return (
          <div>
            <StatusTag status={row.status}>{row.status!}</StatusTag>
            { row.status !== 'active' && (<><br/><StatusWarning>* only active ValueSets can be added to program</StatusWarning></>)} 
          </div>
          
        )
      }, 
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
        <SelectInputTitle>ID</SelectInputTitle>
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
        if (clearSelectedRows === true) {
          setClearSelectedRows(false)
        }
      }}
      // @ts-ignore-next-line
      customStyles={customStyles}
      paginationTotalRows={paginationTotalRows}
      onChangePage={handlePageChange}
      onChangeRowsPerPage={handlePerRowsChange}
      clearSelectedRows={clearSelectedRows}
      selectableRowDisabled={row => row.status !== 'active'}

    />
  )
}

export { SearchTable }