import { useMemo, useState } from 'react'
import styled from 'styled-components'
import DataTable from 'react-data-table-component'
import { cloneDeep } from 'lodash'
import { FilterControl } from './FilterControl'

const TdItem = styled.div`
  display: flex;
`

const TdContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const COLORS = {
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

export const vsFilterContextsHumanReadable = [
  'Change', 'Name', 'OID', 'Condition Name',
  'Condition Code', 'Condition System', 'Condition Operation'
] as const

export const VsFilterContextComputable = vsFilterContextsHumanReadable.map(i => i.replaceAll(' ', '').toLowerCase())

export type AllFilterContextMenuOptions = typeof vsFilterContextsHumanReadable
export type ValueSetFilterContext = typeof VsFilterContextComputable[number]

const generateConditionColor = (conditionItem) => {
  if (conditionItem?.conditionOperation?.startsWith('Add')) {
    return ({
      backgroundColor: COLORS.add
    })
  }
  else if (conditionItem?.conditionOperation?.startsWith('Replace')) {
    return ({
      backgroundColor: COLORS.update
    })
  }
  else if (conditionItem?.conditionOperation?.startsWith('Remove')) {
    return ({
      backgroundColor: COLORS.remove
    })
  } else {
    return ({})
  }
}

const createStyles = (style, conditionItem) => {
  const colorOverride = generateConditionColor(conditionItem)
  return Object.assign(style, colorOverride)
}

const GrouperValueSetsTable = ({ grouperTableData }) => {
  const [filterContext, setFilterContext] = useState<ValueSetFilterContext>('name')
  const [filterItems, setFilterItems] = useState([])

  const filterContextIndex = useMemo(() => {
    return VsFilterContextComputable.findIndex((item) => item === filterContext)
  }, [filterContext])

  const { valueSetsTable } = grouperTableData

  const filteredValueSetOptions = (activeFilters) => {
    if (!activeFilters?.length) return valueSetsTable
    let clonedOptions = cloneDeep(valueSetsTable)

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
    { when: (row) => row.change.toLowerCase() === 'added vs',
      style: {
        backgroundColor: COLORS.add
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
        name: 'Change',
        selector: (row: TableData) => row.change!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Name',
        selector: (row: TableData) => row.name,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'OID',
        selector: (row: TableData) => row.oid!,
        wrap: true,
        grow: 2
      },
      {
        name: 'Code System',
        selector: (row: TableData) => row.codeSystem!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Code System OID',
        selector: (row: TableData) => row.codeSystemOID!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Condition Names',
        sortable: true,
        wrap: true,
        // maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row.conditionUpdates.map(i => (
                  <TdItem style={createStyles({}, i)}>{i?.conditionName || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: 'Condition Codes',
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row.conditionUpdates.map(i => {
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
        name: 'Condition Systems',
        sortable: true,
        wrap: true,
        // maxWidth: '150px',
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row.conditionUpdates.map(i => (
                  <TdItem style={createStyles({ flexGrow: 1, flexShrink: 0 }, i)}>{i?.conditionSystem || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: 'Condition Changes',
        sortable: true,
        wrap: true,
        grow: 2,
        cell: (row: TableData) => {
          return (
            <TdContainer>
              {
                row.conditionUpdates.map(i => (
                  <TdItem style={createStyles({ flexGrow: 1, flexShrink: 0 }, i)}>{i?.conditionOperation || ''}</TdItem>
                ))
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


  return (
    <>
      <FilterControl
        controlType='valueset'
        filterContext={filterContext}
        filterContextHumanReadable={vsFilterContextsHumanReadable?.[filterContextIndex]}
        filteredItems={filterItems}
        setFilteredItems={setFilterItems}
        removeValueSetFilteredItems={removeValueSetFilterItems}
        filterMenuOptions={vsFilterContextsHumanReadable}
        handleSetFilterContext={handleSetFilterContext}
      />
      <DataTable
        style={{ marginBottom: '2em'}}
        title='Value Sets'
        columns={columns}
        data={filteredValueSetOptions(filterItems)}
        pagination
        paginationPerPage={20}
        conditionalRowStyles={conditionalRowStyles}
        dense
      />
    </>
  )
}

export { GrouperValueSetsTable }