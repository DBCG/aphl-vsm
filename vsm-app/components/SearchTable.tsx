import { useMemo, useState } from 'react'
import { ValueSet } from 'fhir/r4'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
import { is } from '@/helpers/is' 
import { FilterInput } from './FilterInput'
import { FilterTextArea } from './FilterTextArea'
import { SelectInputTitle, customStyles, SelectInputContainer } from 'pages/programs/[id]/valuesets'
import { useRouter } from 'next/router'

interface TableData {
  name: ValueSet['name']
  steward: ValueSet['publisher']
  oid: ValueSet['id']
  status: ValueSet['status']
  lastUpdated: ValueSet['date']
}

export interface BundleEntryItem {
  fullUrl: string
  resource: fhir4.ValueSet
}

const parseValueSets = (valueSets: ValueSet[] | BundleEntryItem[] | undefined): TableData[] => {
  if (!valueSets?.length) {
    return []
  }

  if (!valueSets || valueSets.length < 1) { return [] }

  const data = valueSets.map((vs) => {
    let valueSetResource = is.valueSet(vs) ? vs : vs.resource
    console.log('vs: ', vs)
    const { id, name, publisher, url, status, meta, date } = valueSetResource as ValueSet

    const lastUpdated = meta?.lastUpdated || date || 'Unknown'

    return {
      name,
      steward: publisher,
      status: status,
      lastUpdated: lastUpdated,
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
  setFindOids: (eventItem: any) => void,
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
  setFindOids
}: Input) => {
  const tableData = parseValueSets(valueSets)
  const router = useRouter()

  const columns = [
    {
      name: (
        <div>
        <SelectInputTitle>Name</SelectInputTitle>
          <FilterInput
            onChange={(e) => setFindInName(e)}
            style={{
              height: '30px'
            }}
          />
        </div>
      ),
      selector: (row: TableData) => row.name!,
      style: {
        rowWrap: 'wrap'
      }
    },
    {
      name: (
        <SelectInputContainer>
          Status
          <Select
            placeholder='Select'
            classNamePrefix='status'
            inputId='status-selector'
            options={statusOptions}
            onChange={(e) => {setFindInStatus(e)}}
          />
        </SelectInputContainer>
      ),
      sortable: true,
      id: 'select-vs-status',
      selector: (row: TableData) => row.status!,
      maxWidth: '140px'
    },
    {
      name: 'Last Updated',
      sortable: true,
      selector: (row: TableData) => row.lastUpdated!
    },
    {
      name: (
        <div>
        <SelectInputTitle>Steward</SelectInputTitle>
          <FilterInput
            onChange={(e) => setFindInSteward(e)}
            style={{
              height: '30px'
            }}
          />
        </div>
      ),
      selector: (row: TableData) => row.steward!,
      sortable: true
    },
    {
      name: (
        <div>
        <SelectInputTitle>OID</SelectInputTitle>
          <FilterTextArea
            onChange={(e) => setFindOids(e)}
            style={{
              height: '30px'
            }}
          />
        </div>
      ),
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
      onSelectedRowsChange={(e) => {
        setSelectedValueSets(e.selectedRows)
      }}
      customStyles={customStyles}
    />
  )
}

export { SearchTable }