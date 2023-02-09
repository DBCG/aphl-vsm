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
      paddingTop: '12px',
      paddingBottom: '12px',
    }
  }
}

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

    // map over all the valuesets for the group
    const filtered = vsToAdd.map(vs => {
      const idInState = vs.selectedVS.id
      const versionInState = vs.selectedVS.version
      if(vsId === idInState && vsVersion === versionInState) {
        if (!conditions) {
          vs.selectedConditions = []
        } else {
          vs.selectedConditions = vs.selectedConditions.filter(c => {
            return conditions.map(cond => cond.label).includes(c.label)
          })
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
      minWidth: '300px',
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        if(!row.selectedConditions.length) {
          return 'None'
        } else {
          return (
            <Select
              isMulti={true}
              value={row.selectedConditions}
              onChange={(e) => {
                updateConditions({ vsId: row.selectedVS.id, vsVersion: row.selectedVS.version, conditions: e})
              }}
            />
          )
        }
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