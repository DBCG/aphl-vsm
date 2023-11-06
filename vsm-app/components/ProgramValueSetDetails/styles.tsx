import { SetStateAction, Dispatch, useMemo, useState } from 'react'
import { FormGroup, Stack, Switch, Typography } from '@mui/material'
import Select, { MultiValue } from 'react-select'
import styled from 'styled-components'
import { TableRow } from '@/types/valuesets'
import { EditModal } from '../modals/EditModal'
import { Button } from '../buttons/Button'
import { IconButton } from '../buttons/IconButton'
import { Condition, buildConditionOptions, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'
import { Result, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { buildGroupOptions } from '@/helpers/selectHelpers'

export const SelectInputContainer = styled.div`
  width: 100%;
  font-weight: 400;
`

export const SelectInputTitle = styled.p`
  padding-bottom: 8px;
  margin: 0;
  margin-right: 12px;
`

export const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const ActionCol = styled(FlexCol)`
  align-items: center;
`

const ActionTitle = styled(SelectInputTitle)`
  text-align: center;
  margin: 0;
`

export const ReadOnlyContainer = styled.div`
  display: flex;
  flex: 1;
  gap: 6px;
  flex-wrap: wrap;
`

export const ReadOnlyTag = styled.div`
  background-color: var(--theme-color-transparent);
  padding: 6px 8px;
  border-radius: 8px;
`

export const LoadingMessage = styled.p`
  color: blue;
`

export const TableActionContainer = styled.div`
  display: flex;
  border: 4px solid var(--theme-300);
  padding: 2em 1.8em;
  background-color: lightblue;
  width: 100%;
  font-weight: bold;
  color: var(--theme-500);
  column-gap: 24px;
  flex-wrap: wrap;
  gap: 2em;
`

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

interface TableActions {
  selectedRows: TableRow[]
  handleDelete: (selectedRows: TableRow[]) => void
  handleEdit: (editType: 'conditions' | 'groups', selectedRows: TableRow[]) => void
  handleToggleUpdateData: Dispatch<SetStateAction<boolean>>
  isDeleting: boolean
  totalRows: number
  programId: string
}

export const TableActions = ({
  selectedRows,
  handleDelete,
  isDeleting,
  totalRows,
  programId,
  handleToggleUpdateData
}: TableActions) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editInFlight, setEditInFlight] = useState(false)
  const [editType, setEditType] = useState<'condition'| 'grouper'>('condition')
  const [conditionsToEdit, setConditionsToEdit] = useState<MultiValue<Condition>>([])
  const [groupsToEdit, setGroupsToEdit] = useState<MultiValue<{ value: string | undefined; label: string | undefined; id: string | undefined; }>>([])
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyInd, setKeyInd] = useState(0)

  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)
  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId
  }) as Result
  const groupsInProgram = progValueSetDets?.groupsInProgram

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

      const body = JSON.stringify(
        {
          leafIds: selectedRows.map(r => r.valueSet.id) || [],
          conditionsToUpdate: conditionsToEdit,
          action: actionType
        }
      )
      await fetch(
       `/api/programs/${programId}/details/valuesets/conditions/batch`,
       {
        method: 'PUT',
        body
      })

    }
    setEditInFlight(false)
    handleToggleUpdateData((t: boolean) => !t)
    handleCancelModal()
    setKeyInd(k => k + 1)
  }

  // always memoize options to react-select to avoid duplicates sticking
  // around in options after you select them
  const conditionOptions = useMemo(() => {
    return buildConditionOptions(allConditions)
  }, [programId, conditions])

  if (selectedRows?.length) {
    const text = selectedRows.length === totalRows
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
              buttoncontext='delete'
              style={{ backgroundColor: 'var(--accent)' }}
              disabled={isEditing}
              // add a loading state to iconButton blocking clicks, etc
              loading={isDeleting}
              onClick={() => {handleDelete(selectedRows)}}
              data-action='delete'
            />
          </ActionCol>
          <ActionCol>
            <ActionTitle>Bulk Edit</ActionTitle>
            <IconButton
              buttoncontext='edit'
              // add a loading state to iconButton blocking clicks, etc
              loading={isDeleting}
              onClick={() => setIsEditing(true)}
              data-action='edit'
              disabled={isEditing}
            />
          </ActionCol>
        </ActionContainerRow>
        <ActionContainerRow>
        {
          isEditing && (
            <FormGroup>
              <Typography>Property to edit:</Typography>
                <Stack direction="row" spacing={1} alignItems="center" style={{ marginBottom: '1em' }}>
                  <Typography style={{ fontWeight: editType === 'condition' ? 'bold' : 'initial' }}>Conditions</Typography>
                  <Switch
                    inputProps={{ 'aria-label': 'ant design' }}
                    value='grouper'
                    onChange={(e) => handleEditTypeToggle(e)}
                  />
                  <Typography style={{ fontWeight: editType === 'grouper' ? 'bold' : 'initial' }}>Groupers</Typography>
                </Stack>
                { editType === 'condition' ? (
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
                ): (
                  <SelectInputContainer>
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
              <ButtonRow>
                <Button
                  text='Cancel Edit'
                  onClick={() => {
                    setKeyInd(k => k + 1)
                    setIsEditing(false)
                    setGroupsToEdit([])
                    setConditionsToEdit([])
                  }}
                />
                {
                  (Boolean(conditionsToEdit.length || groupsToEdit.length)) && (
                    <>
                      <Button
                        disabled={!conditionsToEdit.length && !groupsToEdit.length}
                        text={`Add ${editType === 'grouper' ? 'Groupers' : 'Conditions'}`}
                        onClick={() => {
                          setActionType('add')
                          setModalOpen(true)
                        }}
                      />
                      <Button
                        disabled={!conditionsToEdit.length && !groupsToEdit.length}
                        text={`Remove ${editType === 'grouper' ? 'Groupers' : 'Conditions'}`}
                        onClick={() => {
                          setActionType('remove')
                          setModalOpen(true)
                        }}
                      />
                    </>
                  )
                }
              </ButtonRow>
            </FormGroup>
          )
        }
        </ActionContainerRow>
      </TableActionContainer>
    )
  } else {
    return null
  }
}
