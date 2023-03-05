import { useState } from 'react'
import Table from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { useGetConditions } from '@/hooks/useGetConditions'
import Select from 'react-select'
import {
  buildConditionOptions,
  formatConditionsComposeInclude
} from '@/helpers/conditionHelpers'
import { FlatGrouperVSet } from 'pages/programs/[id]/grouper'
import { Dispatch, SetStateAction } from 'react'

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

interface TableProps {
  vsToAdd: FlatGrouperVSet[] | []
  setGrouperVSets: Dispatch<SetStateAction<FlatGrouperVSet[]>>
}

const VSReviewTable = ({ vsToAdd, setGrouperVSets, handleUpdateConditions }: TableProps) => {

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
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.name
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.steward
    },
    {
      name: 'ID',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.id
    },
    {
      name: 'Terminology Server',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedTerminologyServer
    },
    {
      name: 'Conditions',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedConditions?.map(c => c.label).join(),
      sortable: false,
      minWidth: '300px',
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => {
        return (
          <Select
            options={buildConditionOptions(allConditions, row?.selectedConditions)}
            isMulti={true}
            defaultValue={row.selectedConditions}
            menuPortalTarget={document.body}
            onChange={(e) => handleUpdateConditions({ conditionInfo: e, vsId: row.selectedValueSet.id })}
            getOptionValue={(option) => option.label}
          />
        )
      }
    },
    {
      name: 'Remove from Grouper',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.id!,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => {
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