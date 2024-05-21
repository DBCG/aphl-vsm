import { useMemo } from 'react'
import styled from 'styled-components'
import DataTable from 'react-data-table-component'

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

const createStyles = (style, conditionItem) => {
  const colorOverride = generateConditionColor(conditionItem)
  return Object.assign(style, colorOverride)
}

const GrouperValueSetsTable = ({ grouperTableData }) => {
  console.log('grouper page: ', grouperTableData)
  const { valueSetsTable } = grouperTableData

  const conditionalRowStyles = [
    { when: (row) => row.change.toLowerCase() === 'added vs',
      style: {
        backgroundColor: COLORS.add
      }
    }
    // need a remove case, but no existing data for that
  ]

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
        wrap: true
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
    ]
    return fields
  }, [])

  return (
    <DataTable
      
      title='Value Sets'
      columns={columns}
      data={valueSetsTable}
      conditionalRowStyles={conditionalRowStyles}
    />
  )
}

export { GrouperValueSetsTable }