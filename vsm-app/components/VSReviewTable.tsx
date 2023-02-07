import Table from 'react-data-table-component'
import styled from 'styled-components'
import { IconButton } from '@/components/buttons/IconButton'
import Select from 'react-select'

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

const VSReviewTable = ({ vsToAdd, setGrouperVSets }) => {
  console.log('vs to add: ', vsToAdd)

  const deleteVS = (idToDelete, versionToDelete) => {

    const filtered = vsToAdd.filter(vs => {
      const idInState = vs.selectedVS.id
      const versionInState = vs.selectedVS.version
      return !(idInState === idToDelete && versionInState === versionToDelete)
    })
    setGrouperVSets(filtered)
  }

  const updateConditions = ({ vsId, vsVersion, conditions }) => {

    const filtered = vsToAdd.map(vs => {
      console.log('vs: ', vs)
      const idInState = vs.selectedVS.id
      const versionInState = vs.selectedVS.version
      if(vsId === idInState && vsVersion === versionInState) {
        console.log('conditions: ', conditions)
        if (!conditions) {
          vs.selectedConditions = []
        } else {
          vs.selectedConditions = vs.selectedConditions.filter(c => conditions.includes(c.label))
        }
      }
      return vs
    })

    setGrouperVSets(filtered)
  }

  const columns = [
    {
      name: 'Name',
      wrap: true,
      selector: (row) => row.selectedVS.name
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row) => row.selectedVS.steward
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
          // <ConditionContainer>{items}</ConditionContainer>
          <Select
            isMulti={true}
            value={row.selectedConditions}
            onChange={(e) => {
              console.log('e: ', e)
              updateConditions({ vsId: row.selectedVS.id, vsVersion: row.selectedVS.version, e})
            }}
          />
        )
      } 
    },
    {
      name: 'Remove from Grouper',
      wrap: true,
      selector: (row: TableData) => row.selectedVS.id!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        return (
          <IconButton
            type='button'
            onClick={(e) => deleteVS(row.selectedVS.id, row.selectedVS.version)}
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