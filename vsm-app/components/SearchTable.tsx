import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import Select from 'react-select'
import debounce from 'lodash.debounce'
import { is } from '@/helpers/is' 
import { FilterInput } from './FilterInput'
import LoadingIndicator from './LoadingIndicator'
import { FilterTextArea } from './FilterTextArea'
import { SelectInputTitle, customStyles, SelectInputContainer } from 'pages/programs/[id]/valuesets'
import { formatValuesetDate } from '@/helpers/formatDates'

const customReactSelectStyles = {
  control: ((styles) => ({ ...styles, zIndex: '100000' })),
}

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  oid: ValueSet['id']
  status: ValueSet['status']
  lastUpdated: string
  version: string
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

const PropagationStopper = ({ children }) => {
  return (
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  )
}

const parseValueSets = (valueSets: ValueSet[] | BundleEntryItem[] | undefined): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs) => {
    let valueSetResource = is.valueSet(vs) ? vs : vs.resource
    const { id, name, publisher, url, status, meta, date } = valueSetResource as ValueSet
    let updatedDate
    if (meta?.lastUpdated || date) {
      updatedDate = formatValuesetDate({ valueSet: valueSetResource, dateType: 'lastUpdated' })
    } else {
      updatedDate = 'Unknown'
    }

    return {
      name,
      steward: publisher,
      status: status,
      lastUpdated: updatedDate,
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
  setSelectedValueSets: (eventItem: any) => void,
  setFindInName: (eventItem: any) => void,
  setFindInSteward: (eventItem: any) => void,
  setFindInStatus: (eventItem: any) => void,
  setFindInOid: (eventItem: any) => void,
  setFindInLastUpdated: (eventItem: any) => void,
  isLoading: boolean,
  showFilters: boolean
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
  isLoading=false,
  showFilters
}: Input) => {
  const tableData = parseValueSets(valueSets)
  const router = useRouter()

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
        <SelectInputContainer onClick={e => e.stopPropagation()} style={{ marginRight: '4px' }}>
          <SelectInputTitle>Status</SelectInputTitle>
          { showFilters && (
            <PropagationStopper>
              <Select
                defaultValue=''
                isClearable={true}
                styles={customReactSelectStyles}
                placeholder='Select'
                classNamePrefix='status'
                inputId='status-selector'
                options={statusOptions}
                onChange={(e) => { setFindInStatus(e?.value) }}
              />
            </PropagationStopper>
          )}
        </SelectInputContainer>
      ),
      sortable: false,
      wrap: true,
      id: 'select-vs-status',
      selector: (row: TableData) => row.status!,
      maxWidth: '180px'
    },
    {
      name: (
        <div>
          <SelectInputTitle>Last Updated</SelectInputTitle>
            { showFilters && (
              <FilterInput
                onChange={(e: React.ChangeEvent<Element>) => {
                  const target = e.target as HTMLInputElement
                  console.log('target.value: ', target.value)
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
      name: 'Version',
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
                console.log('filter')
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
      paginationPerPage={10}
      progressPending={isLoading}
      progressComponent={<LoadingIndicator/>}
      onSelectedRowsChange={(e) => {
        setSelectedValueSets(e.selectedRows)
      }}
      customStyles={customStyles}
    />
  )
}

export { SearchTable }