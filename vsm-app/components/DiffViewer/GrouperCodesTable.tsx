import { useMemo, useState } from 'react'
import DataTable from 'react-data-table-component'
import { FilterControl } from './FilterControl'
import { cloneDeep, divide } from 'lodash'
import { FormGroup, FormControlLabel, Switch, Checkbox } from '@mui/material'
import { ValueSetFilterItem } from './GrouperValueSetsTable'
import { NoDataTableComponent } from './NoDataTableComponent'

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

export const CodeFilterContextComputable = codeFilterContextsHumanReadable.map(i => i.replaceAll(' ', '').toLowerCase())

export type CodeFilterContext = typeof CodeFilterContextComputable[number]

const generateConditionColor = (conditionItem) => {
  if (conditionItem?.operation?.startsWith('Add')) {
    return ({
      backgroundColor: COLORS.add
    })
  }
  else if (conditionItem?.operation?.startsWith('Replace')) {
    return ({
      backgroundColor: COLORS.update
    })
  }
  else if (conditionItem?.operation?.startsWith('Remove')) {
    return ({
      backgroundColor: COLORS.remove
    })
  } else {
    return ({})
  }
}

const ToggleShowNoChange = ({ handleShowUnchanged }) => {
  return (
      <FormGroup onChange={(e) => handleShowUnchanged(e?.target?.checked)}>
        <FormControlLabel control={<Checkbox />} label="Show unchanged Codes" />
      </FormGroup>
  )
}

const GrouperCodesTable = ({ grouperTableData, id }) => {
  const [filterItems, setFilterItems] = useState([])
  const [filterContext, setFilterContext] = useState<CodeFilterContext>('oid')
  const [showUnchanged, setShowUnchanged] = useState(false)
  const { codeSystemsTable } = grouperTableData

  const filterContextIndex = useMemo(() => {
    return CodeFilterContextComputable.findIndex((item) => item === filterContext)
  }, [filterContext])

  const filteredCodeOptions = (activeFilters, showUnchanged) => {
    let clonedOptions = cloneDeep(codeSystemsTable)
    if (!showUnchanged) clonedOptions = clonedOptions.filter(opt => opt?.change)
    if (!activeFilters?.length) return clonedOptions

    const mappedFilters = activeFilters.map((filterItem: ValueSetFilterItem) => {
      const [field, searchTerm] = filterItem.value.split('|')
      return ({ field, searchTerm: searchTerm.trim() })
    })

    mappedFilters.forEach((filterItem: SimplifiedFilterItem) => {
      clonedOptions = clonedOptions.filter(opt => {
        const keys = Object.keys(opt)
        const matchingKeyIndex = keys.map(k => k.toLowerCase()).findIndex(i => i === filterItem.field.toLowerCase())
        return opt[keys[matchingKeyIndex]]?.toLowerCase()?.includes(filterItem.searchTerm)
      })
    })

    return clonedOptions
  }

  const conditionalRowStyles = [
    { when: (row) => row?.change?.toLowerCase() === 'insert',
      style: {
        backgroundColor: COLORS.add
      }
    },
    { when: (row) => row?.change?.toLowerCase() === 'deleted',
    style: {
      backgroundColor: COLORS.remove
    }
  }
]

    // need to do this manually for deletion
const removeValueSetFilterItems = (allFilterItems, itemsToRemove) => {
  setFilterItems(() => [...allFilterItems]) 
}

const handleSetFilterContext = (e) => {
  setFilterContext(e.target.value)
}

  const columns = useMemo(() => {
    const fields = [
      {
        name: <div>Change</div>,
        selector: (row: TableData) => row.change!,
        sortable: true,
        wrap: true,
        maxWidth: '100px',
        style: { textTransform: 'capitalize' }
      },
      {
        name: <div>Value Set OID</div>,
        selector: (row: TableData) => row.oid,
        sortable: true,
        wrap: true,
        grow: 1.5
      },
      {
        name: <div>Code Descriptor</div>,
        sortable: true,
        wrap: true,
        selector: (row: TableData) => row.descriptor!,
        grow: 3
      },
      {
        name: <div>Code</div>,
        selector: (row: TableData) => row.code!,
        wrap: true,
        sortable: true
      },
      {
        name: <div>Code System</div>,
        selector: (row: TableData) => row.codeSystem!,
        wrap: true,
        sortable: true
      },
      {
        name: <div>Code System Version</div>,
        selector: (row: TableData) => row.codeSystemVersion!,
        sortable: true,
        wrap: true,
      },
      {
        name: <div>Code System OID</div>,
        selector: (row: TableData) => row.codeSystemOID!,
        sortable: true,
        wrap: true
      }
    ]
    return fields
  }, [])

  return (
    <div id={id}>
      <DataTable
        defaultSortFieldId={1}
        dense
        title='Codes'
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