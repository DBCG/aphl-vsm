import { TableStyles, createTheme } from 'react-data-table-component'

createTheme(
  'aphl',
  {
    cells: {
      style: {
        paddingTop: '12px',
        paddingBottom: '12px',
        fontFamily: 'Roboto',
        fontSize: '120%'
      }
    },
    headCells: {
      style: {
        fontFamily: 'Roboto'
      }
    },
    rows: {
      style: {
        cursor: 'pointer',
      },
      highlightOnHoverStyle: {
        backgroundColor: '#DBF0F3'
      }
    }
  },
  'light'
)

const customTableStyles = (tableType: 'clickable' | 'readonly'): TableStyles => {
  const baseStyles = {
    headCells: {
      style: {
        padding: '16px',
        overflow: 'visible',
        fontFamily: 'Roboto',
      }
    },
    cells: {
      style: {
        paddingTop: '12px',
        paddingBottom: '12px',
        overflow: 'visible',
        fontSize: '120%'
      }
    },
    rows: {
      style: {},
      highlightOnHoverStyle: {}
    }
  }

  if(tableType === 'clickable') {
    baseStyles.rows.style = { cursor: 'pointer' }
    baseStyles.rows.highlightOnHoverStyle = { backgroundColor: '#DBF0F3' }
  }
  return baseStyles
}

export { customTableStyles }
