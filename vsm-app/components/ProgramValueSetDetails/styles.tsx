import { useMemo, useState } from 'react'
import { FormControlLabel, FormGroup, Stack, Switch, Typography } from '@mui/material'
import Select from 'react-select'
import styled from 'styled-components'
import { TableRow } from '@/types/valuesets'
import { LoadingModal } from '../modals/LoadingModal'
import { EditModal } from '../modals/EditModal'
import { Button } from '../buttons/Button'
import { IconButton } from '../buttons/IconButton'
import { buildConditionOptions, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'
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

interface TableActions {
  selectedRows: TableRow[]
  handleDelete: (selectedRows: TableRow[]) => void
  handleEdit: (editType: 'conditions' | 'groups', selectedRows: TableRow[]) => void
  isDeleting: boolean
  totalRows: number
  programId: string
}

interface EditParams {
  editAction: 'delete' | 'add'
  editDataType: 'grouper' | 'condition'
  vsToEdit: TableRow[]
  // two types of arr
  itemsToAddOrRemove: []
}

export const TableActions = ({
  selectedRows,
  handleDelete,
  handleEdit,
  isDeleting,
  totalRows,
  programId
}: TableActions) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editType, setEditType] = useState<'condition'| 'grouper'>('condition')
  const [conditionsToEdit, setConditionsToEdit] = useState([])
  const [groupsToEdit, setGroupsToEdit] = useState([])
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyInd, setKeyInd] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)
  console.log('allConditions!: ', allConditions) 
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
  
  const handleEditTypeToggle = (e) => {
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
    if (editType === 'condition') {

      const body = JSON.stringify(
        {
          leafIds: selectedRows.map(r => r.valueSet.id) || [],
          conditionsToUpdate: conditionsToEdit,
          action: actionType
        }
      )
      const res = await fetch(
       `/api/programs/${programId}/details/valuesets/conditions/batch`,
       {
        method: 'PUT',
        body
      })

      console.log('res from endpoint: ', res)

    }
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
          loading={isProcessing}
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
                <Stack direction="row" spacing={1} alignItems="center">
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
                      placeholder="Conditions"
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
                        console.log('conditions: ', e)
                        setConditionsToEdit(e)
                      }}
                    />
                  </SelectInputContainer>
                ): (
                  <SelectInputContainer>
                    <Typography>Groupers</Typography>
                    <Select
                      menuPlacement="bottom"
                      placeholder="Filter groups"
                      classNamePrefix="groups"
                      inputId="groups-selector"
                      instanceId="groups-selector"
                      isMulti
                      options={buildGroupOptions(alphabetizedGroups)}
                      // @ts-ignore-next-line
                      onChange={(e) => {
                        console.log('groups: ', e)
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
