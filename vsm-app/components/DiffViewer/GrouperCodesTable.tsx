import { useMemo, useState } from 'react'
import DataTable, { TableColumn, TableRow } from 'react-data-table-component'
import { FilterControl } from './FilterControl'
import { cloneDeep } from 'lodash'
import { FormGroup, FormControlLabel, Checkbox } from '@mui/material'
import { NoDataTableComponent } from './NoDataTableComponent'
import { ActiveFilters, CodeSystemTableItem, GrouperPage, ItemToRemoveVsFilter, ValueSetFilterItem } from './DiffViewerTypes'

const COLORS = {
  add: '#EBEFE9',
  remove: '#FAE6E5',
  update: '#FDF4DD'
}

const customStyle = {
  subHeader: {
    style: {
      paddingLeft: '16px'
    },
  }
}

export const codeFilterContextsHumanReadable = [
  'Change', 'OID', 'Descriptor', 'Code', 'Code System',
  'Code System Version', 'Code System OID'
] as const

export type AllFilterContextMenuOptionsCodes = typeof codeFilterContextsHumanReadable

export const CodeFilterContextComputable = codeFilterContextsHumanReadable.map(i => i.replaceAll(' ', '').toLowerCase())

export type CodeFilterContext = typeof CodeFilterContextComputable[number]


const ToggleShowNoChange = ({ handleShowUnchanged }: { handleShowUnchanged: (show: boolean) => void }) => {
  return (
      <FormGroup onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleShowUnchanged(Boolean(e?.target?.checked))}>
        <FormControlLabel control={<Checkbox style={{ color: 'gray' }} />} label="Show unchanged Codes" />
      </FormGroup>
  )
}

const GrouperCodesTable = ({ grouperTableData, id }: { grouperTableData: GrouperPage, id: string }) => {
  const [filterItems, setFilterItems] = useState<ValueSetFilterItem[]>([])
  const [filterContext, setFilterContext] = useState<CodeFilterContext>('oid')
  const [showUnchanged, setShowUnchanged] = useState(false)
  const { codeSystemsTable } = grouperTableData

  const filterContextIndex = useMemo(() => {
    return CodeFilterContextComputable.findIndex((item) => item === filterContext)
  }, [filterContext])

  const filteredCodeOptions = (activeFilters: ValueSetFilterItem[], showUnchanged: boolean) => {
    let clonedOptions = cloneDeep(codeSystemsTable)
    if (!showUnchanged) clonedOptions = clonedOptions.filter(opt => opt?.change)
    if (!activeFilters?.length) return clonedOptions

    const mappedFilters = activeFilters.map((filterItem: ValueSetFilterItem) => {
      const [field, searchTerm] = filterItem.value.split('|')
      return ({ field, searchTerm: searchTerm.trim() })
    })

    mappedFilters.forEach((filterItem: { field: string, searchTerm: string }) => {
      clonedOptions = clonedOptions.filter(opt => {
        const keys = Object.keys(opt)
        const matchingKeyIndex = keys.map(k => k.toLowerCase()).findIndex(i => i === filterItem.field.toLowerCase())
        return opt[keys[matchingKeyIndex] as keyof CodeSystemTableItem]?.toLowerCase()?.includes(filterItem.searchTerm)
      })
    })

    return clonedOptions
  }

  const conditionalRowStyles = [
    { when: (row: CodeSystemTableItem) => row?.change?.toLowerCase() === 'insert',
      style: {
        backgroundColor: COLORS.add
      }
    },
    { when: (row: CodeSystemTableItem) => row?.change?.toLowerCase() === 'deleted',
    style: {
      backgroundColor: COLORS.remove
    }
  }
]

// need to do this manually for deletion
const removeValueSetFilterItems = (allFilterItems: ValueSetFilterItem[]) => {
  setFilterItems(() => [...allFilterItems]) 
}

const handleSetFilterContext = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setFilterContext(e.target.value)
}

  const columns = useMemo(() => {
    const fields = [
      {
        name: <div>Change</div>,
        selector: (row: CodeSystemTableItem) => row.change!,
        sortable: true,
        wrap: true,
        maxWidth: '100px',
        style: { textTransform: 'capitalize' }
      },
      {
        name: <div>Value Set OID</div>,
        selector: (row: CodeSystemTableItem) => row.oid,
        sortable: true,
        wrap: true,
        grow: 1.5
      },
      {
        name: <div>Code Descriptor</div>,
        sortable: true,
        wrap: true,
        selector: (row: CodeSystemTableItem) => row.descriptor!,
        grow: 3
      },
      {
        name: <div>Code</div>,
        selector: (row: CodeSystemTableItem) => row.code!,
        wrap: true,
        sortable: true
      },
      {
        name: <div>Code System</div>,
        selector: (row: CodeSystemTableItem) => row.codeSystem!,
        wrap: true,
        sortable: true
      },
      {
        name: <div>Code System Version</div>,
        selector: (row: CodeSystemTableItem) => row.codeSystemVersion!,
        sortable: true,
        wrap: true,
      },
      {
        name: <div>Code System OID</div>,
        selector: (row: CodeSystemTableItem) => row.codeSystemOID!,
        sortable: true,
        wrap: true
      }
    ]
    return
  }, [])

  return (
    <div id={id}>
      <DataTable
        defaultSortFieldId={1}
        dense
        title={<p style={{ fontSize: '80%'}}>Codes</p>}
        // @ts-ignore
        columns={columns}
        customStyles={customStyle}
        data={filteredCodeOptions(filterItems, showUnchanged)}
        conditionalRowStyles={conditionalRowStyles}
        pagination
        paginationPerPage={20}
        subHeader
        subHeaderWrap
        noDataComponent={<NoDataTableComponent resourceType='code'/>}
        subHeaderComponent={
          (<div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <FilterControl
              controlType='code'
              filterContext={filterContext}
              filteredItems={filterItems}
              setFilteredItems={setFilterItems}
              removeValueSetFilteredItems={removeValueSetFilterItems}
              filterMenuOptions={codeFilterContextsHumanReadable}
              handleSetFilterContext={handleSetFilterContext}
              // @ts-ignore
              filterContextHumanReadable={codeFilterContextsHumanReadable?.[filterContextIndex]}
            />
            <ToggleShowNoChange handleShowUnchanged={setShowUnchanged} />
          </div>)
        }
      />
    </div>
  )
}

export { GrouperCodesTable }