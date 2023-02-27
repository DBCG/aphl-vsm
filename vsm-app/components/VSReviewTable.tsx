import Table from 'react-data-table-component'
import styled from 'styled-components'
import { IconButton } from '@/components/buttons/IconButton'
import { useGetConditions } from '@/hooks/useGetConditions'
import Select from 'react-select'
import {
  buildConditionOptions,
  formatConditionsComposeInclude
} from '@/helpers/conditionHelpers'
import { useEffect } from 'react'

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

const VSReviewTable = ({ vsToAdd, setGrouperVSets }) => {

  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)

  const deleteVS = (idToDelete: string, versionToDelete: string) => {

    const filtered = vsToAdd.filter(vs => {
      const idInState = vs.selectedValueSet.id
      const versionInState = vs.selectedValueSet.version
      return !(idInState === idToDelete && versionInState === versionToDelete)
    })
    setGrouperVSets(filtered)
  }

  const columns = [
    {
      name: 'Name',
      wrap: true,
      selector: (row) => row?.selectedValueSet?.name
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row) => row?.selectedValueSet?.steward
    },
    {
      name: 'ID',
      wrap: true,
      selector: (row) => row?.selectedValueSet?.id
    },
    {
      name: 'Terminology Server',
      wrap: true,
      selector: (row) => row?.selectedTerminologyServer
    },
    {
      name: 'Conditions',
      wrap: true,
      selector: (row) => row?.selectedConditions!,
      sortable: false,
      minWidth: '300px',
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        return (
          <Select
            options={buildConditionOptions(allConditions, row?.selectedConditions)}
            isMulti={true}
            defaultValue={row.selectedConditions}
            menuPortalTarget={document.body}
          />
        )
      }
    },
    {
      name: 'Remove from Grouper',
      wrap: true,
      selector: (row: TableData) => row?.selectedValueSet?.id!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row) => {
        return (
          <IconButton
            type='button'
            onClick={(e) => deleteVS(row?.selectedValueSet?.id, row?.selectedValueSet?.version)}
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