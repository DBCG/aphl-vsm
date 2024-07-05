import { useMemo, useState } from 'react'
import styled from 'styled-components'
import DataTable from 'react-data-table-component'
import { cloneDeep, divide } from 'lodash'
import { FilterControl } from './FilterControl'
import { Checkbox, FormControlLabel, FormGroup, Switch, ToggleButton } from '@mui/material'
import { NoDataTableComponent } from './NoDataTableComponent'

const TdItem = styled.div`
  display: flex;
  flex-grow: 1;
  padding-left: 6px !important;
`

const TdContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-self: stretch;
  flex-grow: 1;
`

export const COLORS = {
  add: '#EBEFE9',
  remove: '#FAE6E5',
  update: '#FDF4DD'
}

export interface ValueSetFilterItem {
  key: string
  label: string
  value: string
}

interface SimplifiedFilterItem {
  field: string
  searchTerm: string
}

const StyledTable = styled(DataTable)`
  .rdt_TableCol {
    padding-left: 6px !important;
    padding-right: 0 !important;
  };
  .rdt_TableCol:first-of-type {
    padding-left: 16px !important;
  };
  .rdt_TableCell {
    padding-left: 0 !important;
    padding-right: 0 !important;
  };
  .rdt_TableCell:first-of-type {
    padding-left: 10px !important;
  };
  .rdt_TableHeader {
    padding-left: 4px !important;
  };
`

export const vsFilterContextsHumanReadable = [
  'Change', 'Name', 'OID', 'Condition Name',
  'Condition Code', 'Condition System', 'Condition Operation'
] as const

const customStyle = {
  subHeader: {
    style: {
      paddingLeft: '16px'
    },
  }
}

export const VsFilterContextComputable = vsFilterContextsHumanReadable.map(i => i.replaceAll(' ', '').toLowerCase())

export type AllFilterContextMenuOptions = typeof vsFilterContextsHumanReadable
export type ValueSetFilterContext = typeof VsFilterContextComputable[number]

const generateConditionColor = (conditionItem) => {
  if (conditionItem?.conditionChange?.startsWith('Add')) {
    return ({
      backgroundColor: COLORS.add
    })
  }
  else if (conditionItem?.conditionChange?.startsWith('Replace')) {
    return ({
      backgroundColor: COLORS.update
    })
  }
  else if (conditionItem?.conditionChange?.startsWith('Remove')) {
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
      <FormControlLabel control={<Checkbox />} label="Show unchanged Value Sets" />
    </FormGroup>
  )
}

const createStyles = (style, conditionItem) => {
  const colorOverride = generateConditionColor(conditionItem)
  return Object.assign(style, colorOverride)
}

const GrouperValueSetsTable = ({ grouperTableData, id }) => {
  const [filterContext, setFilterContext] = useState<ValueSetFilterContext>('name')
  const [filterItems, setFilterItems] = useState([])
  const [showUnchanged, setShowUnchanged] = useState(false)

  const { valueSetsTable } = grouperTableData

  console.log('vs data here: ', valueSetsTable)
  const filteredValueSetOptions = (activeFilters, showUnchanged) => {
    let clonedOptions = cloneDeep(valueSetsTable)
    if (!showUnchanged) clonedOptions = clonedOptions?.filter(opt => opt?.change?.trim() !== '') || []
    if (!activeFilters?.length) return clonedOptions

    const mappedFilters = activeFilters.map((filterItem: ValueSetFilterItem) => {
      const [field, searchTerm] = filterItem.value.split('|')
      return ({ field, searchTerm: searchTerm.trim() })
    })

    mappedFilters.forEach((filterItem: SimplifiedFilterItem) => {
      // handle non-nested fields first
      if (!filterItem.field.startsWith('condition')) {
        clonedOptions = clonedOptions.filter(opt => opt?.[filterItem.field]?.toLowerCase()?.includes(filterItem.searchTerm))
      } else {
        // search within array of condition info for a match
        clonedOptions = clonedOptions.filter(opt => {
          const hasMatch = opt?.conditionUpdates?.find(conditionUpdateItem => {
            const keys = Object.keys(conditionUpdateItem)
            const fieldIndex = keys.findIndex(item => item.toLowerCase() === filterItem.field.toLowerCase())
            const result = conditionUpdateItem[keys[fieldIndex]]?.toLowerCase()?.includes(filterItem.searchTerm)
            return result
          })
          return hasMatch
        })
      }
    })

    return clonedOptions
  }

  const conditionalRowStyles = [
    {
      when: (row) => row?.change?.toLowerCase() === 'added vs',
      style: {
        backgroundColor: COLORS.add
      }
    },
    {
      when: (row) => row?.change?.toLowerCase() === 'removed vs',
      style: {
        backgroundColor: COLORS.remove
      }
    }
    // need a remove case, but no existing data for that
  ]

  // need to do this manually for deletion
  const removeValueSetFilterItems = (allFilterItems, itemsToRemove) => {
    setFilterItems(() => [...allFilterItems])
  }

  const columns = useMemo(() => {
    const fields = [
      {
        name: <div>Change</div>,
        selector: (row: TableData) => row.change!,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        style: { textTransform: 'capitalize' },
        cell: (row: TableData) => {
          return (
            <TdContainer>
              <TdItem>{row.change}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Name</div>,
        selector: (row: TableData) => row.name,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              <TdItem>{row.name}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>OID</div>,
        selector: (row: TableData) => row.oid!,
        wrap: true,
        grow: 2,
        cell: (row: TableData) => {
          return (
            <TdContainer>
              <TdItem>{row.oid}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Code System</div>,
        selector: (row: TableData) => row.codeSystem!,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              <TdItem>{row.codeSystem}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Code System OID</div>,
        selector: (row: TableData) => row.codeSystemOID!,
        sortable: true,
        wrap: true,
        cell: (row: TableData) => {
          return (
            <TdContainer>
              <TdItem>{row.codeSystemOID}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Condition Names</div>,
        sortable: true,
        wrap: true,
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map(i => (
                  <TdItem style={createStyles({}, i)}>{i?.conditionName || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: <div>Condition Codes</div>,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map(i => {
                  return (
                    <TdItem style={createStyles({}, i)}>{i?.conditionCode || 'No Data'}</TdItem>
                  )
                })
              }
            </TdContainer>
          )
        }
      },
      {
        name: <div>Condition Systems</div>,
        sortable: true,
        wrap: true,
        // maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map(i => (
                  <TdItem style={createStyles({ flexGrow: 1, flexShrink: 0 }, i)}>{i?.conditionSystem || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: <div>Condition Changes</div>,
        sortable: true,
        wrap: true,
        grow: 2,
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map(i => {
                  const color = !i?.conditionChange ? 'white' : 'inherit'
                  return <TdItem style={createStyles({ flexGrow: 1, flexShrink: 0, color }, i)}>{i?.conditionChange || '.'}</TdItem>
                })
              }
            </TdContainer>
          )
        }
      }
    ]
    return fields
  }, [])

  const handleSetFilterContext = (e) => {
    console.log('e.target: ', e.target)
    setFilterContext(e.target.value)
  }

console.log('vs table id: ', id)
  return (
    <div id={id}>
      <StyledTable
        defaultSortFieldId={1}
        noDataComponent={<NoDataTableComponent resourceType='valueset'/>}
        style={{ marginBottom: '2em' }}
        customStyles={customStyle}
        title='Value Sets'
        columns={columns}
        data={filteredValueSetOptions(filterItems, showUnchanged)}
        pagination
        paginationPerPage={20}
        conditionalRowStyles={conditionalRowStyles}
        dense
        subHeader
        subHeaderWrap
        subHeaderComponent={(
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <FilterControl
              controlType='valueset'
              filterContext={filterContext}
              filterContextHumanReadable={vsFilterContextsHumanReadable}
              filteredItems={filterItems}
              setFilteredItems={setFilterItems}
              removeValueSetFilteredItems={removeValueSetFilterItems}
              filterMenuOptions={vsFilterContextsHumanReadable}
              handleSetFilterContext={handleSetFilterContext}
            />
            <ToggleShowNoChange handleShowUnchanged={setShowUnchanged} />
          </div>
        )}
      />
    </div>
  )
}

export { GrouperValueSetsTable }