import { useMemo, useState } from 'react'
import { Button } from '@/components/buttons/Button'
import DataTable from 'react-data-table-component'
import { Box, Chip, IconButton, Typography } from '@mui/material'
import { useGetProvisionalContext } from '@/hooks/useGetProvisionalContext'
import ModeEditIcon from '@mui/icons-material/ModeEdit'
import { toast } from 'react-toastify'
import { updateProvisionalCs } from '@/hooks/useUpdateProvisionalCS'
import { findProvVsUsingCode } from '@/hooks/findProvVsUsingCode'
import Modal from '@mui/material/Modal'
import { findProgramByProvisionalLeaf } from '@/pages/provisional/valueset'
import ArrowOutward from '@mui/icons-material/ArrowOutward'
import { DeleteForever } from '@mui/icons-material'
import { KeyedMutator } from 'swr'
import { CodeTableData } from './ProvisionalEditForm'
import { TextArea } from '../TextArea'

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  maxWidth: '100%',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};
type ExistingCodesTableProps = {
  codeSystem?: fhir4.CodeSystem
  isEditable: boolean
  mutate: KeyedMutator<any>
}

const ExistingCodesTable = ({ codeSystem, isEditable, mutate }: ExistingCodesTableProps) => {
  const [originalCodeItemToEdit, setOriginalCodeItemToEdit] = useState<CodeTableData | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ code: string, url: string } | null>(null)
  const defaultItem = { code: '', definition: '', display: '' }
  const [updatedCodeItem, setUpdatedCodeItem] = useState(defaultItem)
  const [codeUpdateLoading, setCodeUpdateLoading] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [matchingValueSets, setMatchingValueSets] = useState<fhir4.ValueSet[]>([])
  const { provisionalContext } = useGetProvisionalContext()
  const allFieldsPresent = useMemo(() => Object.keys(updatedCodeItem).every(k => (updatedCodeItem as { [key: string]: string })[k]?.trim().length), [updatedCodeItem, originalCodeItemToEdit])

  const changesExist = useMemo(
    () => {
      return (Object.keys(updatedCodeItem)
        // @ts-ignore
        .find(k => updatedCodeItem?.[k]?.trim() !== originalCodeItemToEdit?.[k]?.trim()))
    }, [updatedCodeItem, originalCodeItemToEdit])

  const handleSaveAttempt = async (userConfirmedOverride?: boolean) => {
    setCodeUpdateLoading(true)
    if (!allFieldsPresent) {
      toast.error('All fields must be filled out')
    } else if (!changesExist) {
      toast.error('Code fields are the same, no changes will be saved')
    } else {
      // find provisional valuesets that contain this codesystem
      // if there are none, just continue as usual
      // if there are any using this system, check if the original code is in use
      // if code is being used in provisional valuesets, provide a warning modal to confirm
      // that the user is ok with those other valuesets being updated
      const matches = await findProvVsUsingCode(codeSystem?.url!, originalCodeItemToEdit?.code!)
      if (matches?.matchingValueSets?.length && !userConfirmedOverride) {

        // show modal where you'll need to confirm or cancel
        setUpdateModalOpen(true)
        setMatchingValueSets(matches?.matchingValueSets)
      } else {
        const matchingValueSetIds = matches?.matchingValueSets?.map(vs => vs?.id!)?.filter(x => !!x) || [] as string[]

        const result = await updateProvisionalCs(
          {
            [codeSystem?.url!]: {
              // @ts-ignore
              id: codeSystem?.id,
              action: 'replace-code',
              codeUpdates: [{ old: originalCodeItemToEdit as CodeTableData, new: updatedCodeItem }],
              inValueSets: matchingValueSetIds,
            }
          },
        )
        if (result.error) {
          toast.error(`Provisional Code System could not be updated`)
          setCodeUpdateLoading(false)
        } else {
          toast.success(`Provisional Code System updated`)
          mutate()
          setCodeUpdateLoading(false)
          handleCancel()
          setUpdateModalOpen(false)
        }
      }
    }
    setCodeUpdateLoading(false)
  }

  const handleDeleteAttempt = async (userConfirmedOverride: boolean, itemToDelete: { code: string, url: string } | null) => {
    setCodeUpdateLoading(true)
    if (!itemToDelete) {
      toast.error('Must select a code to delete')
      setCodeUpdateLoading(false)
    } else {
      const matches = await findProvVsUsingCode(codeSystem?.url!, itemToDelete?.code!)
      if (matches?.matchingValueSets?.length && !userConfirmedOverride) {

        setItemToDelete(itemToDelete)
        // show modal where you'll need to confirm or cancel
        setDeleteModalOpen(true)
        setMatchingValueSets(matches?.matchingValueSets)
      } else {
        const matchingValueSetIds = matches?.matchingValueSets
          ?.map(vs => vs?.id!)?.filter(x => !!x) || [] as string[]

        const result = await updateProvisionalCs(
          {
            [codeSystem?.url!]: {
              // @ts-ignore
              id: codeSystem?.id,
              action: 'delete-code',
              codeUpdates: [itemToDelete],
              inValueSets: matchingValueSetIds,
            }
          },
        )
        if (result.error) {
          toast.error(`Provisional Code System could not be updated`)
          setCodeUpdateLoading(false)
          setItemToDelete(null)
        } else {
          mutate()
          setOriginalCodeItemToEdit(null)
          setCodeUpdateLoading(false)
          toast.success(`Provisional Code '${itemToDelete?.code}' deleted`)
          setItemToDelete(null)
        }
      }
    }
    setCodeUpdateLoading(false)
  }

  const handleCancel = () => {
    setOriginalCodeItemToEdit(null)
    setUpdatedCodeItem(defaultItem)
  }

  const columns = useMemo(() => {
    if (!codeSystem) return []
    const fields = [
      {
        name: 'Code',
        selector: (row: fhir4.CodeSystemConcept) => row.code,
        cell: (row: fhir4.CodeSystemConcept) => {
          if (originalCodeItemToEdit && row.code === originalCodeItemToEdit?.code) {
            return (
              <TextArea
                label='Code'
                id="code"
                required={true}
                onChange={(e) => {
                  setUpdatedCodeItem((item) => {
                    let copy = { ...item }
                    copy.code = e?.target?.value || ''
                    return copy
                  })
                }}
                value={updatedCodeItem?.code}
                style={{ minWidth: '20rem', flex: 1 }}
              />
            )
          } else {
            return (
              <p>{row.code}</p>
            )
          }
        }
      },
      {
        name: 'Display',
        selector: (row: fhir4.CodeSystemConcept) => row.display || '',
        cell: (row: fhir4.CodeSystemConcept) => {
          if (originalCodeItemToEdit && row.code === originalCodeItemToEdit?.code) {
            return (
              <TextArea
                label='Update Display'
                id="update-display"
                required={true}
                onChange={(e) => {
                  setUpdatedCodeItem((item) => {
                    let copy = { ...item }
                    copy.display = e?.target?.value || ''
                    return copy
                  })
                }}
                value={updatedCodeItem?.display}
                style={{ minWidth: '20rem', flex: 1 }}
              />
            )
          } else {
            return (
              <p>{row.display}</p>
            )
          }
        }
      },
      {
        name: 'Definition',
        selector: (row: fhir4.CodeSystemConcept) => row.definition || '',
        minWidth: '20rem',
        cell: (row: fhir4.CodeSystemConcept) => {
          if (originalCodeItemToEdit && row.code === originalCodeItemToEdit?.code) {
            return (
              <TextArea
                label='Update Definition'
                id="update-definition"
                required={true}
                onChange={(e) => {
                  setUpdatedCodeItem((item) => {
                    let copy = { ...item }
                    copy.definition = e?.target?.value || ''
                    return copy
                  })
                }}
                value={updatedCodeItem?.definition}
                style={{ minWidth: '20rem', flex: 1 }}
              />
            )
          } else {
            return (
              <p>{row.definition}</p>
            )
          }
        }
      },
      {
        name: 'Edit',
        center: true,
        maxWidth: '120px',
        selector: (row: CodeTableData) => row.code!,
        omit: !isEditable,
        cell: (row: CodeTableData) => {
          const isDisabled = Boolean(originalCodeItemToEdit && (row.code !== originalCodeItemToEdit?.code))
          const currentlyEditing = originalCodeItemToEdit && row.code === originalCodeItemToEdit?.code

          if (currentlyEditing) {
            return (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: '300px', justifyContent: 'center' }}>
                <Button
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={!allFieldsPresent || !changesExist}
                  text='Save changes'
                  onClick={() => handleSaveAttempt(false)}
                  loading={codeUpdateLoading}
                />
                <Button
                  text='Cancel'
                  style={{ backgroundColor: 'gray', whiteSpace: 'nowrap' }}
                  onClick={handleCancel}
                />
              </div>
            )
          } else {
            return (
              <IconButton
                disabled={isDisabled}
                onClick={() => {
                  setOriginalCodeItemToEdit(row)
                  setUpdatedCodeItem({ code: row?.code, display: row?.display, definition: row?.definition })
                }}
              >
                <ModeEditIcon color={isDisabled ? 'disabled' : 'success'} />
              </IconButton>
            )
          }
        }
      },
      {
        name: 'Delete',
        omit: !isEditable,
        center: true,
        maxWidth: '100px',
        selector: (row: CodeTableData) => row.code!,
        cell: (row: CodeTableData) => {
          if (isEditable) {
            return (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <IconButton>
                  <DeleteForever
                    style={{ color: 'var(--accent)' }}
                    color='error'
                    onClick={async () => await handleDeleteAttempt(false, { code: row.code, url: codeSystem.url! })}
                  />
                </IconButton>
              </div>
            )
          } else {
            return null
          }
        }
      },
    ]
    return fields
  }, [codeSystem, originalCodeItemToEdit, updatedCodeItem])

  const inUseVsColumns = useMemo(() => {
    const fields = [
      {
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row?.title
      },
      {
        name: 'Status',
        selector: (row: fhir4.ValueSet) => row?.status
      },
      {
        name: 'ID',
        selector: (row: fhir4.ValueSet) => row?.id
      },
      {
        name: <p>Currently used in program(s)</p>,
        grow: 2,
        selector: (row: fhir4.ValueSet) => row?.id,
        cell: (row: fhir4.ValueSet) => {
          if (Array.isArray(provisionalContext)) {
            const programIdsWithProvisionals = findProgramByProvisionalLeaf(row.url!, provisionalContext)
            if (programIdsWithProvisionals.length) {
              const results = programIdsWithProvisionals.map(p => {
                return (
                  <Chip key={p.programId} target="_blank" icon={<ArrowOutward />} component='a' label={`${p.programTitle} [ID: ${p.programId}]`} href={`/programs/${p.programId}`} clickable={true} />
                )
              })
              return (
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'nowrap', margin: '.8rem 0' }}>
                  {results}
                </div>
              )
            }
            return <p>N/A</p>
          } else {
            return null
          }
        }
      },
    ]
    return fields
  }, [matchingValueSets, provisionalContext])

  return (
    <>
      <Modal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Confirm Editing Code
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            {`This code is currently being used in the following provisional Value Set(s):`}
          </Typography>
          {/* @ts-ignore */}
          <DataTable data={matchingValueSets} columns={inUseVsColumns} />
          <Typography id="modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            By editing this code, you will also edit its definition in the above provisional Value Sets.
          </Typography>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Button onClick={() => setUpdateModalOpen(false)} style={{ backgroundColor: 'darkgray' }} text='Cancel' />
            <Button onClick={() => handleSaveAttempt(true)} text='Continue' />
          </div>
        </Box>
      </Modal>
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-modal-modal-title"
        aria-describedby="delete-modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="delete-modal-modal-title" variant="h6" component="h2">
            Confirm Editing Code
          </Typography>
          <Typography id="delete-modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            {`This code is currently being used in the following provisional Value Set(s):`}
          </Typography>
          {/* @ts-ignore */}
          <DataTable data={matchingValueSets} columns={inUseVsColumns} />
          <Typography id="modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            By deleting this code, you will also delete its definition in the above provisional Value Sets.
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            If this is the only code in a Code System, the provisional Code System will also be deleted.
          </Typography>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Button
              onClick={() => {
                setDeleteModalOpen(false)
                setItemToDelete(null)
              }}
              style={{ backgroundColor: 'darkgray' }}
              text='Cancel'
            />
            <Button onClick={() => handleDeleteAttempt(true, itemToDelete)} text='Continue' />
          </div>
        </Box>
      </Modal>
      {/* @ts-ignore */}
      <DataTable keyField={'code'} pagination data={codeSystem?.concept || []} columns={columns} />
    </>
  )
}

export default ExistingCodesTable