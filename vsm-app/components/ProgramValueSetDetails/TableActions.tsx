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
import { priorityLevelOptions } from '.'

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
export type batchEditData = {
  leafIds: fhir4.ValueSet['id'][]
  conditionsToUpdate: MultiValue<Condition>
  action: editAction
}

interface BulkUpdateFrm {
  bulkToggleFn: () => void
}

const BulkUpdateForm = ({
  bulkToggleFn, bulkEditType, setConditionsToEdit,
  conditionOptions, grouperOptions, priorityOptions,
  setGroupersToEdit, setPriorityToEdit, setIsEditing,
  handleToggleUpdateData, conditionsToEdit, groupsToEdit,
  priorityToEdit, setActionType, setModalOpen, isEditing, setEditType
}) => {

  if (!isEditing) return null
 
  const selectInfo = {
    conditions: { data: conditionOptions, fn: setConditionsToEdit },
    groupers: { data: grouperOptions, fn: setGroupersToEdit },
    priority: { data: priorityOptions, fn: setPriorityToEdit }
  }

  return (
    <FormGroup>
      <FormLabel id='bulk-form-label'>Property to edit:</FormLabel>
      <RadioGroup
        aria-aria-labelledby='bulk-form-label'
        defaultValue='conditions'
        name='bulk-selection-radio-group'
      >
        <FormControlLabel
          value='conditions'
          control={
            <Radio
              onChange={bulkToggleFn}
            />
          }
          label='Conditions'
        />
        <FormControlLabel
          value='priority'
          control={
            <Radio
              onChange={bulkToggleFn}
            />
          }
          label='Priority'
        />
        <FormControlLabel
          value='groupers'
          control={
            <Radio
              onChange={bulkToggleFn}
            />
          }
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
            options={selectInfo[bulkEditType].data}
            onChange={(e) => {
              selectInfo[bulkEditType].fn(e)
            }}
          />
        </SelectInputContainer>
        <ButtonRow>
          <Button
            text="Cancel Edit"
            style={{ backgroundColor: 'gray' }}
            onClick={() => {
              setIsEditing(false)
              setGroupersToEdit([])
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
              disabled={!priorityToEdit?.length}
              text={`Update ${bulkEditType}`}
              onClick={() => {
                setActionType('update')
                setModalOpen(true)
              }}
            />
          )}
        </ButtonRow>
    </FormGroup>
  )
}

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
  const [priorityToEdit, setPriorityToEdit] = useState<MultiValue<Condition>>([])
  const [groupsToEdit, setGroupsToEdit] = useState<
    MultiValue<{ value: string | undefined; label: string | undefined; id: string | undefined }>
  >([])
  const [actionType, setActionType] = useState<editAction>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // bulk actions
  type BulkOptions = 'conditions' | 'groupers' | 'priority'
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
    setPriorityToEdit([])
    setBulkEditType(e.target.value)
  }

  const handleEditTypeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ensure data is cleared out of state when toggled
    setGroupsToEdit([])
    setConditionsToEdit([])
    setEditType(e.target.value)
    if (e?.target?.checked) {
      setEditType('grouper')
    } else {
      setEditType('condition')
    }
  }

  const handleCancelModal = () => {
    setModalOpen(false)
  }

  const handleEditItems = async () => {
    setEditInFlight(true)
    if (editType === 'condition') {
      const batch: batchEditData = {
        leafIds: selectedRows.map((r) => r.valueSet.id) || [],
        leafUrls: selectedRows.map((r) => {
          const appendLatest = r.valueSetPinnedVersion ? `|${r.valueSetPinnedVersion}` : ''
          const versionedUrl = `${r.valueSet.url}${appendLatest}`
          console.log('versioned url: ', versionedUrl)
          return versionedUrl
      }) || [],
        conditionsToUpdate: conditionsToEdit,
        action: actionType
      }
      const body = JSON.stringify(batch)
      await fetch(`/api/programs/${programId}/details/valuesets/conditions/batch`, {
        method: 'PUT',
        body
      }).then((res) => window.location.reload())
    }
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
          <BulkUpdateForm
            setIsEditing={setIsEditing}
            isEditing={isEditing}
            bulkToggleFn={handleEditTypeToggle}
            bulkEditType={bulkEditType}
            conditionOptions={conditionOptions}
            grouperOptions={buildGroupOptions(alphabetizedGroups)}
            priorityOptions={priorityLevelOptions}
            setConditionsToEdit={setConditionsToEdit}
            setGroupersToEdit={setGroupsToEdit}
            setPriorityToEdit={setPriorityToEdit}
            handleToggleUpdateData={handleToggleUpdateData}
            conditionsToEdit={conditionsToEdit}
            groupsToEdit={groupsToEdit}
            priorityToEdit={priorityToEdit}
            setActionType={setActionType}
            setModalOpen={setModalOpen}
          />
        </ActionContainerRow>
      </TableActionContainer>
    )
  } else {
    return null
  }
}
