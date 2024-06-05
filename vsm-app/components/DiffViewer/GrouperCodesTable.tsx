import { useMemo } from 'react'
import styled from 'styled-components'
import DataTable from 'react-data-table-component'

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

const GrouperCodesTable = ({ grouperTableData }) => {
  const { codeSystemsTable } = grouperTableData

  const conditionalRowStyles = [
    { when: (row) => row?.change?.toLowerCase() === 'insert',
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
        maxWidth: '100px'
      },
      {
        name: 'OID',
        selector: (row: TableData) => row.oid,
        sortable: true,
        wrap: true,
        grow: 1.5
      },
      {
        name: 'Descriptor',
        sortable: true,
        wrap: true,
        selector: (row: TableData) => row.descriptor!,
        grow: 3
      },
      {
        name: 'Code',
        selector: (row: TableData) => row.code!,
        wrap: true,
        sortable: true
      },
      {
        name: 'Code System',
        selector: (row: TableData) => row.codeSystem!,
        wrap: true,
        sortable: true
      },
      {
        name: 'Code System Version',
        selector: (row: TableData) => row.codeSystemVersion!,
        sortable: true,
        wrap: true,
      },
      {
        name: 'Code System OID',
        selector: (row: TableData) => row.codeSystemOID!,
        sortable: true,
        wrap: true
      }
    ]
    return fields
  }, [])

  return (
    <DataTable
      dense
      title='Codes'
      columns={columns}
      data={codeSystemsTable}
      conditionalRowStyles={conditionalRowStyles}
      pagination
      paginationPerPage={20}
    />
  )
}

export { GrouperCodesTable }