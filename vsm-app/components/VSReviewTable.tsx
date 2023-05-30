import Table from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { useGetConditions } from '@/hooks/useGetConditions'
import Select from 'react-select'
import { buildConditionOptions, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'
import { ConditionsHandler } from 'pages/programs/[id]/grouper'
import { FlatGrouperVSet } from '../types/grouperTypes'
import { Dispatch, SetStateAction } from 'react'
import { customTableStyles } from './tables/themes'

interface TableProps {
  vsToAdd: FlatGrouperVSet[]
  setGrouperVSets: Dispatch<SetStateAction<FlatGrouperVSet[]>>
  handleUpdateConditions: ({ conditionInfo, vsId }: ConditionsHandler) => void
}

const VSReviewTable = ({ vsToAdd, setGrouperVSets, handleUpdateConditions }: TableProps) => {
  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)

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
      name: 'Name',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.name!
    },
    {
      name: 'Steward',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.steward!
    },
    {
      name: 'ID',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedValueSet?.id!
    },
    {
      name: 'Terminology Server',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedTerminologyServer!
    },
    {
      name: 'Conditions',
      wrap: true,
      selector: (row: FlatGrouperVSet) => row?.selectedConditions?.map((c) => c?.label)?.join() || '',
      sortable: false,
      minWidth: '300px',
      style: {
        rowWrap: 'wrap'
      },
      cell: (row: FlatGrouperVSet) => (
        <Select
          options={buildConditionOptions(allConditions, row?.selectedConditions)}
          isMulti={true}
          defaultValue={row.selectedConditions}
          menuPortalTarget={document.body}
          onChange={(e) => {
            handleUpdateConditions({ conditionInfo: e, vsId: row.selectedValueSet.id })
          }}
          getOptionValue={(option) => option.label}
        />
      )
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
            deletedItemDescription={`valueset with id ${row.selectedValueSet.id} and version ${row.selectedValueSet.version}`}
            type="button"
            onClick={() => deleteVS(row?.selectedValueSet?.id!, row?.selectedValueSet?.version!)}
            buttonContext="delete"
            style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
          />
        )
      }
    }
  ]

  return <Table data={vsToAdd} columns={columns} customStyles={customTableStyles('readonly')} />
}

export { VSReviewTable }
