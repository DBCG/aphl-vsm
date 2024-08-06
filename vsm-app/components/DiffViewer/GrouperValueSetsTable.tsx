import { useMemo, useState } from 'react'
import styled from 'styled-components'
import DataTable, { TableColumn } from 'react-data-table-component'
import { cloneDeep } from 'lodash'
import { FilterControl } from './FilterControl'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
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
  'Change', 'Name', 'OID', 'Priority', 'Code System Name(s)', 'Code System OID(s)', 'Condition Name',
  'Condition Code', 'Condition System', 'Condition Change'
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

interface Row {
  change: string
  name: string
  oid: string
  priority: string
  codeSystems: {
    oid: string
    name: string
  }[]
  conditionUpdates: {
    conditionName: string
    conditionCode: string
    conditionSystem: string
    conditionChange: string
  }[]
}

type RowKey = keyof Row

interface ActiveFilters {
  value: string
  label: string 
}

const generateConditionColor = (conditionItem: { conditionChange?: string }) => {
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

const ToggleShowNoChange = ({ handleShowUnchanged }: { handleShowUnchanged: (checked: boolean) => void}) => {
  return (
    <FormGroup onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleShowUnchanged(Boolean(e?.target?.checked))}>
      <FormControlLabel control={<Checkbox style={{ color: 'gray' }}/>} label="Show unchanged Value Sets" />
    </FormGroup>
  )
}

const createStyles = (style: React.CSSProperties, conditionItem: { conditionChange?: string }) => {
  const colorOverride = generateConditionColor(conditionItem)
  return Object.assign(style, colorOverride)
}

const GrouperValueSetsTable = ({ grouperTableData, id }: { grouperTableData: any, id: any }) => {
  const [filterContext, setFilterContext] = useState<ValueSetFilterContext>('name')
  const [filterItems, setFilterItems] = useState([])
  const [showUnchanged, setShowUnchanged] = useState(false)

  const { valueSetsTable }: { valueSetsTable: Row[]} = grouperTableData

  const filteredValueSetOptions = (activeFilters: ActiveFilters[], showUnchanged: boolean): Row[] => {
    let clonedOptions = cloneDeep(valueSetsTable)
    if (!showUnchanged) clonedOptions = clonedOptions?.filter(opt => opt?.change?.trim() !== '') || []
    if (!activeFilters?.length) return clonedOptions

    const mappedFilters = activeFilters.map((filterItem) => {
      const [field, searchTerm] = filterItem.value.split('|')
      return ({ field, searchTerm: searchTerm.trim() })
    })

    mappedFilters.forEach((filterItem: SimplifiedFilterItem) => {
      // non-nested fields first
      if (!filterItem.field.startsWith('condition') && !filterItem.field.startsWith('codesystem')) {
        clonedOptions = clonedOptions.filter(opt => opt?.[filterItem.field as RowKey]?.toLowerCase()?.includes(filterItem.searchTerm))
      }
      if (filterItem.field.startsWith('codesystemname')) {
        clonedOptions = clonedOptions.filter(opt => {
          const result = opt.codeSystems.findIndex(sys => {
            const name = sys.name.toLowerCase()
            const searchTerm = filterItem.searchTerm.toLowerCase()
            return name.includes(searchTerm)
        }) > -1
          return result
        })
      } else if (filterItem.field.startsWith('codesystemoid')) {
        clonedOptions = clonedOptions.filter(opt => {
          const result = opt.codeSystems.findIndex(sys => {
            const oid = sys.oid.toLowerCase()
            const searchTerm = filterItem.searchTerm.toLowerCase()
            return oid.includes(searchTerm)
        }) > -1
          return result
        })
      } else if (filterItem.field.startsWith('condition')) {
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
  ]

  // need to do this manually for deletion
  const removeValueSetFilterItems = (allFilterItems, itemsToRemove) => {
    setFilterItems(() => [...allFilterItems])
  }

  const columns = useMemo(() => {
    const fields = [
      {
        name: <div>Change</div>,
        selector: (row: Row) => row.change!,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        style: { textTransform: 'capitalize' },
        cell: (row: Row) => {
          return (
            <TdContainer>
              <TdItem>{row.change}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Name</div>,
        selector: (row: Row) => row.name,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: Row) => {
          return (
            <TdContainer>
              <TdItem>{row.name}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>OID</div>,
        selector: (row: Row) => row.oid!,
        wrap: true,
        grow: 2,
        cell: (row: Row) => {
          return (
            <TdContainer>
              <TdItem>{row.oid}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Priority</div>,
        selector: (row: Row) => row.priority!,
        wrap: true,
        cell: (row: Row) => {
          return (
            <TdContainer style={{ backgroundColor: row.change === 'Updated Priority' ? COLORS.update : 'inherit' }}>
              <TdItem style={{ textTransform: 'capitalize'}}>{row?.priority || 'No priority specified'}</TdItem>
            </TdContainer>
          )
        }
      },
      {
        name: <div>Code System OID(s)</div>,
        selector: (row: Row) => row.oid,
        sortable: true,
        wrap: true,
        maxWidth: '150px',
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.codeSystems?.map((i, index) => (
                  <TdItem key={i.oid || index} style={createStyles({}, i)}>{i?.oid || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: <div>Code System Name(s)</div>,
        selector: (row: Row) => row.oid,
        sortable: true,
        wrap: true,
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.codeSystems?.map((i, index) => (
                  <TdItem key={i.oid || index} style={createStyles({}, i)}>{i?.name || 'No Data'}</TdItem>
                ))
              }
            </TdContainer>
          )
        }
      },
      {
        name: <div>Condition Names</div>,
        sortable: true,
        wrap: true,
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map((i, index) => (
                  <TdItem key={i.conditionCode || index} style={createStyles({}, i)}>{i?.conditionName || 'No Data'}</TdItem>
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
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map((i, index) => {
                  return (
                    <TdItem key={i.conditionCode || index} style={createStyles({}, i)}>{i?.conditionCode || 'No Data'}</TdItem>
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
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map((i, index) => (
                  <TdItem key={i.conditionSystem + i.conditionCode} style={createStyles({ flexGrow: 1, flexShrink: 0 }, i)}>{i?.conditionSystem || 'No Data'}</TdItem>
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
        cell: (row: Row) => {
          return (
            <TdContainer>
              {
                row?.conditionUpdates?.map(i => {
                  const color = !i?.conditionChange ? 'white' : 'inherit'
                  return <TdItem key={i.conditionSystem + i.conditionCode + i.conditionChange} style={createStyles({ flexGrow: 1, flexShrink: 0, color }, i)}>{i?.conditionChange || '.'}</TdItem>
                })
              }
            </TdContainer>
          )
        }
      }
    ]
    return fields as TableColumn<Row>[]
  }, [])

  const handleSetFilterContext = (e) => {
    setFilterContext(e.target.value)
  }

  return (
    <div id={id}>
      <StyledTable
        defaultSortFieldId={1}
        noDataComponent={<NoDataTableComponent resourceType='valueset'/>}
        style={{ marginBottom: '2em' }}
        customStyles={customStyle}
        title={<p style={{ fontSize: '80%'}}>Value Sets</p>}
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