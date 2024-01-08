import { Button } from '../buttons/Button'
import { TableRow } from '@/types/valuesets'
import styled from 'styled-components'
import { TableActionContainer, SelectInputContainer, SelectInputTitle, FlexCol } from './styles'
import { SetStateAction, Dispatch, useMemo, useState, useEffect } from 'react'
import { FormGroup, Stack, Switch, Typography, Radio, RadioGroup, FormControlLabel, FormLabel } from '@mui/material'
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

type BulkOptions = 'conditions' | 'groupers' | 'priority'

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
  const [editType, setEditType] = useState<BulkOptions>('conditions')
  const [conditionsToEdit, setConditionsToEdit] = useState<MultiValue<Condition>>([])
  const [groupsToEdit, setGroupsToEdit] = useState<
    MultiValue<{ value: string | undefined; label: string | undefined; id: string | undefined }>
  >([])
  const [updatedPriority, setUpdatedPriority] = useState<'routine' | 'emergent' | null>(null)
  const [actionType, setActionType] = useState<editAction>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyInd, setKeyInd] = useState(0)

  // set for modal
  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  const alphabetizedGroups =
    groupsInProgram?.sort((firstItem: fhir4.ValueSet, secondItem: fhir4.ValueSet) => {
      if (typeof firstItem.title === 'string' && typeof secondItem.title === 'string') {
        return firstItem.title.toUpperCase().localeCompare(secondItem.title.toUpperCase())
      }
      // if not enough information to order, just keep as they are
      return 0
    }) || []

  const handleEditTypeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ensure data is cleared out of state when toggled
    setGroupsToEdit([])
    setConditionsToEdit([])
    if (e?.target?.value) {
      setEditType(e.target.value as BulkOptions)
    }
  }

  const handleCancelModal = () => {
    setModalOpen(false)
  }

  const handleEditItems = async () => {
    setEditInFlight(true)
    if (editType === 'conditions') {
      const batch: batchEditData = {
        leafIds: selectedRows.map((r) => r.valueSet.id) || [],
        conditionsToUpdate: conditionsToEdit,
        action: actionType
      }
      const body = JSON.stringify(batch)
      await fetch(`/api/programs/${programId}/details/valuesets/conditions/batch`, {
        method: 'PUT',
        body
      }).then((res) => window.location.reload())
    } else if (editType === 'priority') {
      console.log('got here: ', 'eee')
      console.log('updatedPriority', updatedPriority)
      console.log('selectedRows', selectedRows)
      const batch: batchEditData = {
        leafIds: selectedRows.map((r) => r.valueSet.id) || [],
        priority: updatedPriority,
        action: actionType
      } 
      
      const body = JSON.stringify(batch)
      try {
        const result = await fetch(`/api/programs/${programId}/valuesets/bulk`, {
          method: 'PUT',
          body
        }).then((res) => {
          // window.location.reload()
      })

      console.log('result: ', result)
      } catch (e) {
        console.error('error: ', e)
      }
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
              // add a loading state to iconButton blocking clicks, etc
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
              // add a loading state to iconButton blocking clicks, etc
              loading={isDeleting}
              onClick={() => setIsEditing(true)}
              data-action="edit"
              disabled={isEditing}
            />
          </ActionCol>
        </ActionContainerRow>
        <ActionContainerRow>
          {isEditing && (
            <FormGroup>
              <FormLabel id="bulk-edit-radio">Property to bulk edit:</FormLabel>
              <RadioGroup
                aria-labelledby="bulk-edit-radio"
                defaultValue="conditions"
                name="radio-buttons-group"
                onChange={handleEditTypeToggle}
              >
              <FormControlLabel value="conditions" control={<Radio />} label="Conditions" />
              <FormControlLabel value="groupers" control={<Radio />} label="Groupers" />
              <FormControlLabel value="priority" control={<Radio />} label="Priority" />
            </RadioGroup>
              {editType === 'conditions' && (
                <SelectInputContainer>
                  <Typography>Conditions</Typography>
                  <Select
                    menuPlacement="bottom"
                    placeholder="Select Conditions"
                    classNamePrefix="conditions"
                    inputId="conditions-selector"
                    instanceId="conditions-selector"
                    isMulti
                    key={`conditions-${keyInd}`}
                    styles={{
                      menu: (baseStyles) => ({
                        ...baseStyles,
                        zIndex: 10
                      })
                    }}
                    options={conditionOptions}
                    onChange={(e) => {
                      setConditionsToEdit(e)
                    }}
                  />
                </SelectInputContainer>
              )}
              { editType === 'groupers' && (
                <SelectInputContainer>
                  <i style={{ display: 'block', color: 'var(--accent)' }}>***Batch Grouper functionality is not added yet, will not work</i>
                  <Typography>Groupers</Typography>
                  <Select
                    menuPlacement="bottom"
                    placeholder="Select groups"
                    classNamePrefix="groups"
                    inputId="groups-selector"
                    instanceId="groups-selector"
                    isMulti
                    options={buildGroupOptions(alphabetizedGroups)}
                    // @ts-ignore-next-line
                    onChange={(e) => {
                      setGroupsToEdit(e)
                    }}
                    key={`groups-${keyInd}`}
                    styles={{
                      menu: (baseStyles, state) => ({
                        ...baseStyles,
                        zIndex: 10
                      })
                    }}
                  />
                </SelectInputContainer>
              )}
              { editType === 'priority' && (
                <SelectInputContainer>
                  Priority
                  <Select
                    menuPlacement="bottom"
                    placeholder="Set Priority"
                    classNamePrefix="priority"
                    inputId="priority-selector"
                    instanceId="priority-selector"
                    menuPortalTarget={myDocument}
                    options={priorityLevelOptions}
                    onChange={(e) => {
                      setUpdatedPriority(e?.value || 'routine')
                    }
                    }
                  />
                </SelectInputContainer>
              )}
              <ButtonRow>
                <Button
                  text="Cancel Edit"
                  style={{ backgroundColor: 'gray' }}
                  onClick={() => {
                    setKeyInd((k) => k + 1)
                    setIsEditing(false)
                    setEditType('conditions')
                    setGroupsToEdit([])
                    setConditionsToEdit([])
                    handleToggleUpdateData()
                  }}
                />
                {Boolean(conditionsToEdit.length || groupsToEdit.length) && (
                  <>
                    <Button
                      disabled={!conditionsToEdit.length && !groupsToEdit.length}
                      text={`Add ${editType === 'groupers' ? 'Groupers' : 'Conditions'}`}
                      onClick={() => {
                        setActionType('add')
                        setModalOpen(true)
                      }}
                    />
                    <Button
                      disabled={!conditionsToEdit.length && !groupsToEdit.length}
                      text={`Remove ${editType === 'groupers' ? 'Groupers' : 'Conditions'}`}
                      onClick={() => {
                        setActionType('remove')
                        setModalOpen(true)
                      }}
                    />
                  </>
                )}
                {updatedPriority && (
                  <Button
                    disabled={!selectedRows.length}
                    text={`Update Value Set Priority`}
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
