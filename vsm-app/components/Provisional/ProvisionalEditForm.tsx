import styled from 'styled-components'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { TextArea } from '@/components/TextArea'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import DataTable from 'react-data-table-component'
import { Box, Chip, IconButton, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { PageTitle } from '../Typography'
import { LoadingMessage } from '../ProgramValueSetDetails/styles'
import { useGetProvisionalContext } from '@/hooks/useGetProvisionalContext'
import { ErrorMessage } from '../ErrorMessage'
import ModeEditIcon from '@mui/icons-material/ModeEdit'
import { toast } from 'react-toastify'
import { updateProvisionalCs } from '@/hooks/useUpdateProvisionalCS'
import { findProvVsUsingCode } from '@/hooks/findProvVsUsingCode'
import Modal from '@mui/material/Modal'
import { findProgramByProvisionalLeaf } from '@/pages/provisional/valueset'
import ArrowOutward from '@mui/icons-material/ArrowOutward'
import { isValidCode, IsValidFormatResponse, isValidString } from '@/helpers/fhirDataTypeHelpers'
import { DeleteForever } from '@mui/icons-material'
import { KeyedMutator } from 'swr'

const QuestionnaireRowContainer = styled.div`
  display: flex;
  gap: 1em;
  row-gap: .8rem;
  flex-wrap: wrap;
`

const ButtonRowContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  column-gap: 1rem;
`

const NoProvVsWrapper = styled.div`
  display: flex;
  padding: .8em 2em;
  justify-content: center;
  border: 1px solid var(--theme-300);
  background-color: white;
  flex-grow: 1;
`

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

const noDataComponent = (tableType: 'setProvisionals' | 'reviewProvisionals') => {
  if (tableType === 'setProvisionals') {
    return (
      <div>
        <p>Add code items above to generate list</p>
      </div>
    )
  } else {
    return (
      <div>
        <p>No Provisional Codes have been added to this Value Set</p>
      </div>
    )
  }
}

interface CodeTableData {
  code: string
  display: string
  definition: string
}

const allFieldsExist = (codeItems: string[]) => {
  const filtered = codeItems.filter(i => i.trim() !== '')
  // check if vals are even valid
  const allFieldsPopulated = filtered.length === 3
  return allFieldsPopulated
}


const ExistingCodesTable = ({ codeSystem, isEditable, mutate }: { codeSystem?: fhir4.CodeSystem, isEditable: boolean, mutate: KeyedMutator<any> }) => {
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
              <SearchInput
                label='Code'
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
              <SearchInput
                label='Update Display'
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
              <SearchInput
                label='Update Definition'
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

interface ProvisionalEditProps {
  canEdit: boolean
}

interface CodeSystemBase {
  label: string
  value: string
}

const ProvisionalCSForm = ({ canEdit }: ProvisionalEditProps) => {
  const router = useRouter()
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState<CodeSystemBase | undefined>()
  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)
  const allVsacCS = useGetCS()
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')
  const [codeItemsToAdd, setCodeItemsToAdd] = useState<fhir4.CodeSystemConcept[]>([])
  const [formSubmitting, setFormSubmitting] = useState(false)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [loading, setLoading] = useState(false)
  // error states
  const [codeError, setCodeError] = useState<null | IsValidFormatResponse>(null)
  const [displayError, setDisplayError] = useState<null | IsValidFormatResponse>(null)
  const [definitionError, setDefinitionError] = useState<null | IsValidFormatResponse>(null)

  const { provisionalCS, provCsError, mutateProvCs } = useGetProvisionalCS(selectedCodeSystemBase?.value)

  const handleDelete = useCallback((item: CodeTableData) => {
    const filteredItems = codeItemsToAdd?.filter(i => !(i?.code === item.code))
    setCodeItemsToAdd(filteredItems)
  }, [codeItemsToAdd])

  const clearCurrentCodeItems = () => {
    setCodeToAdd('')
    setDefinitionToAdd('')
    setDisplayToAdd('')
  }

  useEffect(() => {
    clearCurrentCodeItems()
  }, [selectedCodeSystemBase])

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  const selectOptions = useMemo(() => {
    const mapped = allVsacCS?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
    const defaultOption = mapped?.[0]
    if (!router.query.csSelected) {
      setSelectedCodeSystemBase(defaultOption)
    }
    return mapped
  }, [allVsacCS])

  useEffect(() => {
    const valueFromRouter = router.query.csSelected
    if (!selectedCodeSystemBase && typeof valueFromRouter === 'string') {
      const codeSystemName = valueFromRouter.split('/CodeSystem/')[1]
      const option = selectOptions?.find((o) => o.label === codeSystemName)
      setSelectedCodeSystemBase(option)
    }
  }, [router?.query?.csSelected, selectOptions])

  const enableAdd = useMemo(() => {
    const shouldEnable = allFieldsExist([codeToAdd, displayToAdd, definitionToAdd])
    return shouldEnable
  }, [codeToAdd, displayToAdd, definitionToAdd])

  const codeFormatErrorExists = useMemo(() => {
    return codeError?.isValid === false || displayError?.isValid === false || definitionError?.isValid === false
  }, [codeError, displayError, definitionError])

  const codeColumns = useMemo(() => {
    const fields = [
      {
        name: 'Code',
        selector: (row: CodeTableData) => row.code!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Display',
        selector: (row: CodeTableData) => row.display!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Definition',
        selector: (row: CodeTableData) => row.definition!,
        wrap: true
      },
      {
        name: 'Delete',
        selector: (row: CodeTableData) => row.code!,
        maxWidth: '4rem',
        cell: (row: CodeTableData) => (
          <IconButton
            onClick={() => handleDelete(row)}
          >
            <DeleteForever color='error' />
          </IconButton>
        )
      },
    ]

    return fields
  }, [codeItemsToAdd, handleDelete, provisionalCS])

  const handleAddToList = () => {
    setLoading(true)
    setCodeItemsToAdd(prev => [
      ...prev,
      { code: codeToAdd, display: displayToAdd, definition: definitionToAdd }
    ])
    clearCurrentCodeItems()
    setLoading(false)
  }

  const handleUpdateCS = async () => {
    if (loading) return
    setLoading(true)
    setFormSubmitting(true)
    if (!selectedCodeSystemBase) {
      toast.error('No CodeSystemBase selected!')
      return
    }
    const codesBySystemToUpdate = { [selectedCodeSystemBase.value]: codeItemsToAdd }

    const submitBody = { codesBySystemToUpdate }
    const result = await fetch('/api/codesystem/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })

    if (result.ok) {
      toast.success('Provisional Code System updated successfully')
      setFormSubmitting(false)
      setCodeItemsToAdd([])
      mutateProvCs()
    } else {
      setFormSubmitting(false)
    }
    setLoading(false)
  }

  if (!provisionalCS && !canEdit) {
    return <p>Editing Code Systems not permitted here.</p>
  } else {
    return (
      <div>
        <PageTitle>{`${can(session, 'edit') ? 'Create or Edit' : 'View'} VSM Provisional Code System`}</PageTitle>
        <ErrorMessage error={provCsError} />
        <p>Select a Code System URL</p>
        <QuestionnaireRowContainer style={{ marginBottom: '2rem' }}>
          <Select
            isClearable={false}
            id={"code-system-url-selector"}
            isDisabled={!canEdit}
            isLoading={loading}
            loadingMessage={() => <LoadingMessage>Loading...</LoadingMessage>}
            options={selectOptions}
            isMulti={false}
            menuPortalTarget={myDocument}
            value={selectedCodeSystemBase}
            styles={reactSelectOptionStyle({ minWidth: '30rem' })}
            onChange={(e: SingleValue<CodeSystemBase>) => {
              router.push(`${router.asPath.split('?')[0]}?csSelected=${(e?.value)}`)
              setSelectedCodeSystemBase(e!)
            }}
          />
        </QuestionnaireRowContainer>
        {provisionalCS?.length ? (
          <div>
            <p>A provisional code system exists in VSM for {selectedCodeSystemBase?.label} containing the following codes:</p>
            <ExistingCodesTable
              codeSystem={provisionalCS.find((c: fhir4.CodeSystem) => c?.extension?.find(ext => ext.valueUri === selectedCodeSystemBase?.value))}
              isEditable={can(session, 'edit')}
              mutate={mutateProvCs}
            />
            {can(session, 'edit') && (
              <p style={{ marginBottom: '1rem' }}>You may add more provisional codes to your code system below:</p>
            )}
          </div>
        ) : (
          <NoProvVsWrapper style={{ flexDirection: 'column', flexWrap: 'nowrap', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ marginBottom: 0 }}>{`No existing VSM Provisional Code Systems found for ${selectedCodeSystemBase?.label}.`}</p>
            {can(session, 'edit') && <p>{`Create one by adding code items below.`}</p>}
          </NoProvVsWrapper>
        )}
        {can(session, 'edit') && (
          <>
            <QuestionnaireRowContainer>
              <SearchInput
                label='Code'
                disabled={loading}
                onChange={(e) => {
                  const codeErrorResult = isValidCode(e?.target?.value)
                  setCodeError(codeErrorResult)
                  // handle empty string case
                  setCodeToAdd(e.target.value)
                }}
                value={codeToAdd}
                style={{ minWidth: '20rem', flex: 1 }}
                required={true}
                errorMessage={codeError?.isValid ? null : codeError?.message}
              />
              <SearchInput
                label='Display'
                disabled={loading}
                onChange={(e) => {
                  const displayErrorResult = isValidString(e?.target?.value)
                  setDisplayError(displayErrorResult)
                  setDisplayToAdd(e.target.value)
                }}
                value={displayToAdd}
                style={{ minWidth: '20rem', flex: 1 }}
                required={true}
                errorMessage={displayError?.isValid ? null : displayError?.message}
              />
              <TextArea
                label='Definition (more detail about this code)'
                disabled={loading}
                onChange={(e) => {
                  const definitionErrorResult = isValidString(e?.target?.value)
                  setDefinitionError(definitionErrorResult)
                  setDefinitionToAdd(e.target.value)
                }}
                value={definitionToAdd}
                style={{ minWidth: '20rem', flex: 1 }}
                required={true}
                errorMessage={definitionError?.isValid ? null : definitionError?.message}
              />
            </QuestionnaireRowContainer>
            <ButtonRowContainer>
              <Button
                variant='contained'
                text='Add to List'
                onClick={handleAddToList}
                disabled={!enableAdd || loading || codeFormatErrorExists}
              />
            </ButtonRowContainer>
            <p>{`Code List to add: `}</p>
            <DataTable
              // @ts-ignore
              data={codeItemsToAdd}
              keyField={'code'}
              columns={codeColumns}
              noDataComponent={noDataComponent('setProvisionals')}
            />
            <ButtonRowContainer>
              <Button
                variant='contained'
                text='ADD TO SYSTEM'
                disabled={!Boolean(codeItemsToAdd?.length) || loading}
                onClick={handleUpdateCS}
                loading={formSubmitting}
              />
            </ButtonRowContainer>
          </>
        )}
      </div>
    )
  }
}

interface ProvEditFormItems {
  canEdit: boolean
}

export const ProvisionalEditForm = ({ canEdit }: ProvEditFormItems) => {
  return (
    <ProvisionalCSForm
      canEdit={canEdit || true}
    />
  )
}