import Table from 'react-data-table-component'
import styled from 'styled-components'
import { IconButton } from '@/components/buttons/IconButton'

interface TableData {
  terminologyServer: string
  id: string
  name: string
  steward: string
}

const customStyles = {
  cells: {
    style: {
      paddingRight: '18px',
      paddingLeft: '18px',
      paddingTop: '8px',
      paddingBottom: '8px',
    }
  }
}

const ConditionContainer = styled.div`
  display: flex;
  justify-content: flex-start;
`

const ConditionItem = styled.div`
  padding: 4px 8px;
  border-radius: 8px;
  background-color: var(--theme-100);
`

const VSReviewTable = ({ vsToAdd }) => {
  console.log('vs to add: ', vsToAdd)
  const columns = [
    {
      name: 'Name',
      wrap: true,
      selector: (row) => row.selectedVS.name
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row) => row.selectedVS.publisher
    },
    {
      name: 'ID',
      wrap: true,
      selector: (row) => row.selectedVS.id
    },
    {
      name: 'Terminology Server',
      wrap: true,
      selector: (row) => row.selectedTerminologyServer
    },
    {
      name: 'Conditions',
      wrap: true,
      selector: (row) => row.selectedConditions!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        const items = row?.selectedConditions?.map(c => (
          <ConditionItem key={c.label}>{c.label}</ConditionItem>
        ))
        return (
          <ConditionContainer>{items}</ConditionContainer>
        )
      } 
    },
    {
      name: 'Remove from Grouper',
      wrap: true,
      selector: (row: TableData) => row.id!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        return (
          <IconButton
            type='button'
            onClick={(e) => console.log('delete')}
            buttonContext='delete'
            style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
          />
        )
      }
      
    },
  ]

  return (
    <Table
      data={vsToAdd}
      columns={columns}
      customStyles={customStyles}
    />
  )
}

export { VSReviewTable }