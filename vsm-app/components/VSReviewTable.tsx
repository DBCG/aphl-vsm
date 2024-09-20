import Table from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { useGetConditions } from '@/hooks/useGetConditions'
import Select from 'react-select'
import { reactSelectOptionStyle } from './styleOverrides/reactSelect'
import { buildConditionOptions } from '@/helpers/conditionHelpers'
import { ConditionsHandler, PriorityHandler } from 'pages/programs/[id]/grouper'
import { FlatGrouperVSet } from '../types/grouperTypes'
import React, { Dispatch, SetStateAction } from 'react'
import { customTableStyles } from './tables/themes'
import { priorityLevelOptions } from './ProgramValueSetDetails'

interface TableProps {
  vsToAdd: FlatGrouperVSet[]
  setGrouperVSets: Dispatch<SetStateAction<FlatGrouperVSet[]>>
  handleUpdateConditions: ({ conditionInfo, vsId }: ConditionsHandler) => void
  handleUpdatePriority: ({ priorityInfo, vsId }: PriorityHandler) => void
}

const VSReviewTable = ({ vsToAdd, setGrouperVSets, handleUpdateConditions, handleUpdatePriority }: TableProps) => {
  const allConditions = useGetConditions()

  const deleteVS = (idToDelete: string, versionToDelete: string) => {
    const filtered = vsToAdd.filter((vs) => {
      const idInState = vs.selectedValueSet.id
      const versionInState = vs.selectedValueSet.version
      return !(idInState === idToDelete && versionInState === versionToDelete)
    })
    setGrouperVSets(filtered)
  }

  const columns = [
    {
      name: 'Title',
      minWidth: '20rem',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.valueSet?.title || row?.selectedValueSet?.name || 'Untitled'
    },
    {
      name: 'ID',
      minWidth: '300px',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.id?.split('-')?.[0]!
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.steward!,
      maxWidth: '10rem'
    },
    {
      name: 'Origin',
      maxWidth: '100px',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedTerminologyServer!
    },
    {
      name: 'Conditions',
      wrap: true,
      minWidth: '250px',
      selector: (row: FlatGrouperVSet) => row?.selectedConditions?.map((c) => c?.label)?.join() || '',
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => (
        <Select
          options={buildConditionOptions(allConditions, row?.selectedConditions)}
          isMulti={true}
          defaultValue={row.selectedConditions}
          menuPortalTarget={document.body}
          styles={reactSelectOptionStyle()}
          onChange={(e) => {
            handleUpdateConditions({ conditionInfo: e, vsId: row.selectedValueSet.id })
          }}
          getOptionValue={(option) => option.label}
        />
      )
    },
    {
      name: 'Priority',
      wrap: true,
      minWidth: '250px',
      selector: (row: FlatGrouperVSet) => row?.selectedPriority,
      sortable: false,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => (
        <Select
          options={priorityLevelOptions}
          isMulti={false}
          isClearable={false}
          defaultValue={priorityLevelOptions?.find(opt => opt.value === row.selectedPriority)}
          menuPortalTarget={document.body}
          styles={reactSelectOptionStyle()}
          onChange={(e) => {
            handleUpdatePriority({ priorityInfo: e!, vsId: row.selectedValueSet.id })
          }}
          getOptionValue={(option) => option.label}
        />
      )
    },
    {
      name: 'Remove',
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.id!,
      sortable: false,
      minWidth: '100px',
      center: true,
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => {
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <IconButton
              deletedItemDescription={`valueset with id ${row.selectedValueSet.id} and version ${row.selectedValueSet.version}`}
              type="button"
              onClick={async () => deleteVS(row?.selectedValueSet?.id!, row?.selectedValueSet?.version!)}
              buttoncontext="delete"
              style={{ backgroundColor: 'darkRed', margin: '0 auto', alignSelf: 'center' }}
            />
          </div>
        )
      }
    }
  ]

  return <Table data={vsToAdd} columns={columns} customStyles={customTableStyles('readonly')} />
}

export { VSReviewTable }
