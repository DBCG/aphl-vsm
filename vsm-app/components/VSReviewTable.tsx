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

const parseVSInfo = (vsInfo) => {

  if (!vsInfo?.length) return []

  let data = []

  vsInfo.forEach(item => {
    item.selectedValueSets.forEach(vs => {
      data.push({
        terminologyServer: item?.selectedTerminologyServer,
        id: vs?.id,
        name: vs?.name,
        steward: vs?.steward,
        conditions: item?.selectedConditions?.map(c => c.label)
      })
    })
  })
  return data
}

const ConditionContainer = styled.div`
  display: flex;
  justify-content: flex-start;
`

const ConditionItem = styled.div`
  padding: 4px 8px;
  border-radius: 8px;
  background-color: lightblue;
`

const VSReviewTable = ({ vsToAdd }) => {
  const tableData = parseVSInfo(vsToAdd)

  const columns = [
    {
      name: 'Name',
      wrap: true,
      selector: (row) => row.name
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row) => row.steward
    },
    {
      name: 'ID',
      wrap: true,
      selector: (row) => row.id
    },
    {
      name: 'Terminology Server',
      wrap: true,
      selector: (row) => row.terminologyServer
    },
    {
      name: 'Conditions',
      wrap: true,
      selector: (row: TableData) => row.conditions!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        const items = row?.conditions?.map(c => (
          <ConditionItem key={c}>{c}</ConditionItem>
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
      data={tableData}
      columns={columns}
      customStyles={customStyles}
    />
  )
}

export { VSReviewTable }