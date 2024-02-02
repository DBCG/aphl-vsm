import { Button } from '../buttons/Button'
import { TableRow } from '@/types/valuesets'
import styled from 'styled-components'
import { TableActionContainer, SelectInputContainer,
  SelectInputTitle,FlexCol
} from './styles'
import React, { SetStateAction, Dispatch, useMemo, useState } from 'react'
import {
  FormGroup, Typography, Radio,
  RadioGroup, FormControlLabel, FormLabel
} from '@mui/material'
import Select, { MultiValue } from 'react-select'
import { EditModal } from '../modals/EditModal'
import { IconButton } from '../buttons/IconButton'
import { Condition, ConditionItem, buildConditionOptions } from '@/helpers/conditionHelpers'
import { buildGroupOptions } from '@/helpers/selectHelpers'
import { PriorityLevelOption, priorityLevelOptions } from '.'

const ActionContainerRow = styled.div`
  display: flex;
  align-items: center;
  column-gap: 2em;
  min-width: 300px;
  width: 100%;
`

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1em;
  margin-top: 2em;
`

const ActionCol = styled(FlexCol)`
  align-items: center;
`

const ActionTitle = styled(SelectInputTitle)`
  text-align: center;
  margin: 0;
`

interface TableActions {
  selectedRows: TableRow[]
  groupsInProgram: fhir4.ValueSet[]
  formattedConditions: ConditionItem[]
  handleDelete: (selectedRows: TableRow[]) => void
  handleToggleUpdateData: Dispatch<SetStateAction<void>>
  handleBulkEdit: () => void
  isDeleting: boolean
  totalRows: number
  programId: string
}

type editAction = 'add' | 'remove' | 'update' | null

interface GrouperItem {
  value: string | undefined
  label: string | undefined
  id: string
}

type BatchEditData = {
  leafUrls: fhir4.ValueSet['url'][]
  conditionsToUpdate: MultiValue<Condition>
  action: editAction
  priorityToEdit: PriorityLevelOption | null
  groupersToUpdate: MultiValue<GrouperItem>
}

type BulkOptions = 'conditions' | 'groupers' | 'priority'

export const TableActions = ({
  selectedRows,
  handleDelete,
  formattedConditions,
  groupsInProgram,
  isDeleting,
  totalRows,
  programId,
  handleToggleUpdateData
}: TableActions) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editInFlight, setEditInFlight] = useState(false)
  const [editType, setEditType] = useState<'condition' | 'grouper'>('condition')
  const [conditionsToEdit, setConditionsToEdit] = useState<MultiValue<Condition>>([])
  const [priorityToEdit, setPriorityToEdit] = useState<PriorityLevelOption | null>(null)
  const [groupsToEdit, setGroupsToEdit] = useState<MultiValue<GrouperItem>>([])
  const [actionType, setActionType] = useState<editAction>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // bulk actions
  const [bulkEditType, setBulkEditType] = useState<BulkOptions>('conditions')

  const alphabetizedGroups =
    groupsInProgram?.sort((firstItem: fhir4.ValueSet, secondItem: fhir4.ValueSet) => {
      if (typeof firstItem.title === 'string' && typeof secondItem.title === 'string') {
        return firstItem.title.toUpperCase().localeCompare(secondItem.title.toUpperCase())
      }
      // if not enough information to order, just keep as they are
      return 0
    }) || []

  const handleBulkRadioToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ensure data cleared out of state when toggled
    setGroupsToEdit([])
    setConditionsToEdit([])
    setPriorityToEdit(null)
    setBulkEditType(e.target.value as BulkOptions)
  }

  const handleCancelModal = () => {
    setModalOpen(false)
  }

  const handleEditItems = async () => {
    setEditInFlight(true)
      const batch: BatchEditData = {
        leafUrls: selectedRows.map((r) => {
          const appendLatest = r.valueSetPinnedVersion ? `|${r.valueSetPinnedVersion}` : ''
          const versionedUrl = `${r.valueSet.url}${appendLatest}`
          return versionedUrl
      }) || [],
        conditionsToUpdate: conditionsToEdit,
        action: actionType,
        priorityToEdit,
        groupersToUpdate: groupsToEdit

      }
      const body = JSON.stringify(batch)
      await fetch(`/api/programs/${programId}/details/valuesets/batch`, {
        method: 'PUT',
        body
      }).then((res) => {
        window.location.reload()
      })

  }

  // always memoize options to react-select to avoid duplicates sticking
  // around in options after you select them
  const conditionOptions = useMemo(() => {
    return buildConditionOptions(formattedConditions)
  }, [formattedConditions])

  if (selectedRows?.length) {
    const text =
      selectedRows.length === totalRows
        ? `You have selected all ${totalRows} Valuesets in this Program`
        : `You have selected ${selectedRows.length} out of ${totalRows} total Valuesets`

  const selectInfo = {
    conditions: { data: conditionOptions, fn: setConditionsToEdit },
    groupers: { data: buildGroupOptions(alphabetizedGroups), fn: setGroupsToEdit },
    priority: { data: priorityLevelOptions, fn: setPriorityToEdit }
  }

    return (
      <TableActionContainer>
        <EditModal
          actionType={actionType}
          isOpen={modalOpen}
          handleCancelModal={handleCancelModal}
          loading={editInFlight}
          program={null}
          handleModalAction={handleEditItems}
          dataType={editType}
          totalVs={selectedRows?.length || 0}
        />
        <ActionContainerRow>
          <span>{text}</span>
          <ActionCol>
            <ActionTitle style={{ textAlign: 'center', margin: 0 }}>Delete</ActionTitle>
            <IconButton
              buttoncontext="delete"
              style={{ backgroundColor: 'var(--accent)' }}
              disabled={isEditing}
              loading={isDeleting}
              onClick={() => {
                handleDelete(selectedRows)
              }}
              data-action="delete"
            />
          </ActionCol>
          <ActionCol>
            <ActionTitle>Bulk Edit</ActionTitle>
            <IconButton
              buttoncontext="edit"
              loading={isDeleting}
              onClick={() => setIsEditing(true)}
              data-action="edit"
              disabled={isEditing}
            />
          </ActionCol>
        </ActionContainerRow>
        <ActionContainerRow>
          { isEditing && (
            <FormGroup>
              <FormLabel id='bulk-form-label'>Property to edit:</FormLabel>
              <RadioGroup
                aria-aria-labelledby='bulk-form-label'
                defaultValue='conditions'
                name='bulk-selection-radio-group'
              >
                <FormControlLabel
                  value='conditions'
                  control={<Radio onChange={handleBulkRadioToggle}/>}
                  label='Conditions'
                />
                <FormControlLabel
                  value='priority'
                  control={<Radio onChange={handleBulkRadioToggle} />}
                  label='Priority'
                />
                <FormControlLabel
                  value='groupers'
                  control={<Radio onChange={handleBulkRadioToggle}/>}
                  label='Groupers'
                />
              </RadioGroup>
              <SelectInputContainer>
                <Typography style={{ textTransform: 'capitalize' }}>
                  {bulkEditType}
                </Typography>
                  <Select
                    menuPlacement="bottom"
                    placeholder={`Select ${bulkEditType}`}
                    classNamePrefix={bulkEditType}
                    inputId={`${bulkEditType}-selector`}
                    instanceId={`${bulkEditType}-selector`}
                    isMulti={bulkEditType !== 'priority'}
                    key={`${bulkEditType}-key`}
                    styles={{
                      menu: (baseStyles) => ({
                        ...baseStyles,
                        zIndex: 10
                      })
                    }}
                    options={selectInfo[bulkEditType].data as any}
                    onChange={(e) => {
                      selectInfo[bulkEditType].fn(e as any)
                    }}
                  />
                </SelectInputContainer>
                <ButtonRow>
                  <Button
                    text="Cancel Edit"
                    style={{ backgroundColor: 'gray' }}
                    onClick={() => {
                      setIsEditing(false)
                      setGroupsToEdit([])
                      setConditionsToEdit([])
                      handleToggleUpdateData()
                    }}
                  />
                  {Boolean(conditionsToEdit.length || groupsToEdit.length) && (
                    <>
                      <Button
                        disabled={!conditionsToEdit.length && !groupsToEdit.length}
                        text={`Add ${bulkEditType}`}
                        onClick={() => {
                          setActionType('add')
                          setModalOpen(true)
                        }}
                      />
                      <Button
                        disabled={!conditionsToEdit.length && !groupsToEdit.length}
                        text={`Remove ${bulkEditType}`}
                        onClick={() => {
                          setActionType('remove')
                          setModalOpen(true)
                        }}
                      />
                    </>
                  )}
                  {Boolean(bulkEditType === 'priority') && (
                    <Button
                      disabled={!priorityToEdit}
                      text={`Update ${bulkEditType}`}
                      onClick={() => {
                        setActionType('update')
                        setModalOpen(true)
                      }}
                    />
                  )}
                </ButtonRow>
            </FormGroup>
          )}
        </ActionContainerRow>
      </TableActionContainer>
    )
  } else {
    return null
  }
}
