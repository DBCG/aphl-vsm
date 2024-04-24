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

const customTableStyles = (tableType: 'clickable' | 'readonly', additionalStyles: any = {}): TableStyles => {
  const baseStyles = {
    responsiveWrapper: {
      style: {
        OverflowY: 'hidden',
        minHeight: '100%',
        maxHeight: '100%'
      }
    },
    table: {
      style: {
        fontFamily: 'Roboto',
        minHeight: '70px',
      }
    },
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
        ...additionalStyles
      }
    },
    rows: {
      style: {
        cursor: 'auto',
        overflow: 'visible'
      },
      highlightOnHoverStyle: { backgroundColor: '#DBF0F3' },
    }
  }

  if (tableType === 'clickable') {
    baseStyles.rows.style = {
      cursor: 'pointer',
      overflow: 'visible'
    }
  }
  return baseStyles
}

export { customTableStyles }
