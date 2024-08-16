import { Button } from '@/components/buttons/Button'
import Select, { SingleValue } from 'react-select'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DataTable from 'react-data-table-component'
import { TextArea } from '@/components/TextArea'
import styled from 'styled-components'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { useGetProvisionalContext } from '@/hooks/useGetProvisionalContext'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { set, uniqBy } from 'lodash'
import { cloneDeep } from 'lodash'
import { useRouter } from 'next/router'
import { SearchInput } from '@/components/SearchInput'
import { PageTitle } from '@/components/Typography'
import { useSession } from 'next-auth/react'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { Box, Chip, IconButton, Modal, Typography } from '@mui/material'
import { ArrowOutward, DeleteForever } from '@mui/icons-material'
import { ProvisionalsByProgram } from '@/pages/api/programs/provisional'
import { ErrorMessage } from '@/components/ErrorMessage'
import { modalStyle } from '@/styles'
import { toast } from 'react-toastify'
import { isValidCode, IsValidFormatResponse, isValidString } from '@/helpers/fhirDataTypeHelpers'

interface CodeDetailsProp {
  data: fhir4.ValueSet
}


interface RowItem {
  system: string
  code: string
  display: string
}

interface CodeInfo {
  code: string
  definition: string
  display: string
}

type CodeSystemExtended = fhir4.CodeSystem & {
  concept: CodeInfo[]
}

type CodesBySystemToAdd = Record<string, CodeInfo[]>

interface FlattenedCodeWithSystem {
  code: string
  definition: string
  display: string
  name: string
  system: string
}

const customExpandStyles = {
  rows: {
    style: {
      backgroundColor: 'var(--theme-100)',
    },
  },
  tableWrapper: {
    style: {
      paddingLeft: '96px'
    }
  },
  headCells: {
    style: {
      fontWeight: 'bold',
      backgroundColor: 'var(--theme-100)'
    },
  }
}

const QuestionnaireRowContainer = styled.div`
  display: flex;
  gap: 1em;
  row-gap: .8rem;
  flex-wrap: wrap;
`

const NoProvVsWrapper = styled.div`
  display: flex;
  padding: .8em 2em;
  justify-content: center;
  border: 1px solid var(--theme-300);
  background-color: white;
  flex-grow: 1;
`

type CodesBySystem = Record<string, CodeInfo[]>

interface ExistingCodesProps {
  systemName: string
  codeSystem: fhir4.CodeSystem
  handleAddCodes: (codes: CodesBySystem, action: 'add' | 'remove') => void
}

interface SelectedRows {
  selectedRows: FlattenedCodeWithSystem[]
  allSelected: boolean
  selectedCount: number
}

interface SelectedRowsInExistingProvCodes {
  selectedRows: CodeSystemExtended['concept']
  allSelected: boolean
  selectedCount: number
}

export const findProgramByProvisionalLeaf = (leafUrlToFind: string, provisionalContext: ProvisionalsByProgram) => {
  const programIds = provisionalContext
    ?.filter(i => i.provisionalLeafs?.find(l => l.url === leafUrlToFind))
    ?.map(p => ({ programId: p.programId, programTitle: p.programTitle }))

  return programIds
}

const ExistingCodesTable = ({ systemName, codeSystem, handleAddCodes }: ExistingCodesProps) => {
  const [selectedRows, setSelectedRows] = useState<CodeInfo[]>([])
  const [toggledClearRows, setToggledClearRows] = useState(false)

  const handleChangeSelectedRows = (r: SelectedRowsInExistingProvCodes) => {
    setSelectedRows(r.selectedRows)
  }

  const handleClear = () => setToggledClearRows(t => !t)

  const handleAdd = () => {
    handleAddCodes({ [codeSystem.url!]: [...selectedRows] }, 'add')
    handleClear()
  }

  const contextActions = useMemo(() => {
    return (
      <div>
        <Button
          text={`Clear`}
          style={{ marginRight: '.5rem', backgroundColor: 'darkgray' }}
          onClick={handleClear}
        />
        <Button
          text={`Add to Staging`}
          onClick={handleAdd}
        />
      </div>
    )
  }, [selectedRows])

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Code',
        selector: (row: CodeSystemExtended['concept'][number]) => row.code!,
      },
      {
        name: 'Display',
        selector: (row: CodeSystemExtended['concept'][number]) => row.display!,
      },
      {
        name: 'Definition',
        selector: (row: CodeSystemExtended['concept'][number]) => row.definition!,
        minWidth: '20rem',
        cell: (row: CodeSystemExtended['concept'][number]) => (<p>{row.definition!}</p>)
      }
    ]
    return fields
  }, [systemName])

  return (
    <DataTable
      title={`Existing VSM Provisional Codes for ${systemName}`}
      selectableRows={true}
      selectableRowsNoSelectAll
      pagination
      // @ts-ignore
      data={(codeSystem?.concept || []) as CodeSystemExtended['concept']}
      // @ts-ignore
      columns={columns}
      onSelectedRowsChange={(r) => {
        handleChangeSelectedRows(r)
      }}
      contextActions={contextActions}
      clearSelectedRows={toggledClearRows}
    />
  )
}

const NoDataComponent = () => {
  return (
    <div style={{ display: 'flex', margin: '1rem' }}>
      <p style={{ textAlign: 'center' }}>No existing VSM Provisional Value Sets found.</p>
    </div>
  )
}

const CodeDetailsExpanded = ({ data }: CodeDetailsProp) => {
  const composeInclude = data?.compose?.include

  const codesBySystem = composeInclude
    ?.map(i => i.concept?.map(c => Object.assign(c, { system: i.system }))).flat() || []

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Code',
        selector: (row: fhir4.ValueSetComposeIncludeConcept) => row.code,
      },
      {
        name: 'Display',
        selector: (row: fhir4.ValueSetComposeIncludeConcept) => row.display,
      },
      {
        name: 'System',
        selector: (row: RowItem) => row.system,
        minWidth: '20rem',
        cell: (row: RowItem) => (<p>{row.system}</p>)
      }
    ]
    return fields
  }, [data])

  return (
    // @ts-ignore
    <DataTable
      customStyles={customExpandStyles}
      // @ts-ignore-next-line
      data={codesBySystem || []}
      // @ts-ignore-next-line
      columns={columns}
    />
  )
}

const ProvisionalVSEdit = () => {
  // get existing prov valuesets + codesystems
  const { provisionalVS, isVsLoading, provVsError, mutateProvVs } = useGetProvisionalVS()
  const { provisionalCS, isCsLoading, provCsError, mutateProvCs } = useGetProvisionalCS()
  const { provisionalContext, isContextLoading, provContextError, mutateProvContext } = useGetProvisionalContext()
  const [showVsForm, setShowVsForm] = useState(false)
  const [provisionalVsIdForUpdate, setProvisionalVsIdForUpdate] = useState<string | undefined>(undefined)
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState<SingleValue<{ value: string; label: string; }> | undefined>(undefined)
  // staging table
  const [selectedStagingRows, setSelectedStagingRows] = useState<FlattenedCodeWithSystem[]>([])
  const [clearStagedCodes, setClearStagedCodes] = useState(false)
  // NOTE! provisional value sets are not associated with conditions at this point

  // deleting
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)
  const existingProvisionalCs = useGetProvisionalCS(selectedCodeSystemBase?.value)
  const allVsacCS = useGetCS()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  // default valueset details to tell if changed
  const [defaultTitle, setDefaultTitle] = useState('')
  const [defaultAuthor, setDefaultAuthor] = useState('')
  const [defaultSteward, setDefaultSteward] = useState('')
  // valueset details
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [steward, setSteward] = useState('')

  // codes to add in a-la-carte code form
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')

  const [codesBySystemToAdd, setCodesBySystemToAdd] = useState<CodesBySystemToAdd>({})

  // loading + error state
  const [loading, setLoading] = useState(false)
  const [titleError, setTitleError] = useState<IsValidFormatResponse | null>(null)
  const [authorError, setAuthorError] = useState<IsValidFormatResponse | null>(null)
  const [stewardError, setStewardError] = useState<IsValidFormatResponse | null>(null)
  // code errors
  const [codeError, setCodeError] = useState<IsValidFormatResponse | null>(null)
  const [displayError, setDisplayError] = useState<IsValidFormatResponse | null>(null)
  const [definitionError, setDefinitionError] = useState<IsValidFormatResponse | null>(null)

  const changesExistForExistingVs = useMemo(() => {
    return Boolean(title?.trim() !== defaultTitle?.trim() || author.trim() !== defaultAuthor.trim() || steward.trim() !== defaultSteward.trim() || Object.keys(codesBySystemToAdd).length)
  }, [codesBySystemToAdd, title, author, steward])

  const handleToggleClearStaged = () => setClearStagedCodes((c: boolean) => !c)
  const router = useRouter()

  const handleUpdateStaging = (codesBySystemToUpdate: CodesBySystemToAdd, action: 'add' | 'remove') => {
    let currentCodesToAdd = cloneDeep(codesBySystemToAdd)
    const systems = Object.keys(codesBySystemToUpdate)
    systems.forEach(system => {
      if (action === 'add') {
        if (!currentCodesToAdd?.[system]) {
          currentCodesToAdd[system] = codesBySystemToUpdate[system]
        } else {
          const existingCodes = currentCodesToAdd?.[system] || []
          const dedupedCodes = uniqBy(codesBySystemToUpdate[system].concat(existingCodes), 'code')
          currentCodesToAdd = Object.assign(currentCodesToAdd, { [system]: dedupedCodes })
        }
      }
    })
    setCodesBySystemToAdd(currentCodesToAdd)
  }

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  useEffect(() => {
    const matchingVs = provisionalVS?.find((vs: fhir4.ValueSet | undefined) => vs?.id === provisionalVsIdForUpdate)
    const defaultTitle = matchingVs?.title || ''
    const defaultAuthor = matchingVs?.extension?.find((ext: fhir4.Extension | undefined) => ext?.url?.endsWith('/valueset-author'))?.valueContactDetail?.name || ''
    const defaultSteward = matchingVs?.extension?.find((ext: fhir4.Extension | undefined) => ext?.url?.endsWith('/valueset-steward'))?.valueContactDetail?.name || ''
    setDefaultTitle(defaultTitle)
    setDefaultAuthor(defaultAuthor)
    setDefaultSteward(defaultSteward)
    setTitle(defaultTitle)
    setAuthor(defaultAuthor)
    setSteward(defaultSteward)
  }, [provisionalVsIdForUpdate])

  const existingProvisionalVsColumns = useMemo(() => {
    const fields = [
      {
        name: 'Delete',
        selector: (row: fhir4.ValueSet) => row.title!,
        maxWidth: '10rem',
        omit: !provisionalVsIdForUpdate || !can(session, 'edit'),
        cell: (row: fhir4.ValueSet) => {
          if (row.id === provisionalVsIdForUpdate) {
            return (
              <IconButton
                onClick={async () => await handleDeleteProvisionalVs()}
              >
                <DeleteForever color='error' />
              </IconButton>

            )
          } else {
            return null
          }
        }
      },
      {
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row.title!,
        maxWidth: '10rem',
      },
      {
        name: 'Contains Provisional Code System(s)',
        selector: (row: fhir4.ValueSet) => {
          const systems = row?.compose?.include?.map(ci => ci.system) || []
          return systems
        },
        sortable: true,
        wrap: true,
        maxWidth: '40rem',
        cell: (row: fhir4.ValueSet) => {
          const systems = row?.compose?.include?.map(ci => ci.system) || ['[This Value Set is empty]']
          return (
            <div>
              {systems.map(s => <p key={s}>{s}</p>)}
            </div>
          )
        }
      },
      {
        name: 'Provisional Value Set is used in program(s):',
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
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', margin: '.8rem 0' }}>
                  {results}
                </div>
              )
            }
            return null
          } else {
            return null
          }
        }
      }
    ]

    return fields
  }, [provisionalVS, provisionalContext, provisionalVsIdForUpdate])

  const stagedCodeColumns = useMemo(() => {
    const fields = [
      {
        name: 'System',
        selector: (row: FlattenedCodeWithSystem) => row.name,
        maxWidth: '10rem',
      },
      {
        name: 'Code',
        selector: (row: FlattenedCodeWithSystem) => row.code,
      },
      {
        name: 'Display',
        selector: (row: FlattenedCodeWithSystem) => row.display,
      },
      {
        name: 'Definition',
        selector: (row: FlattenedCodeWithSystem) => row.definition,
      }
    ]

    return fields
  }, [codesBySystemToAdd])

  const handleClickNewVS = () => {
    setProvisionalVsIdForUpdate(undefined)
    setShowVsForm(true)
  }

  // set a default selected row on initial render via query params if exists
  const defaultSelectedRows = useCallback((row: fhir4.ValueSet) => {
    const result = Boolean(row.id && router?.query?.vsSelected && (row.id === router?.query?.vsSelected))
    if (result) {
      setShowVsForm(true)
      setProvisionalVsIdForUpdate(row.id)
    }
    return result
  }, [router?.query?.vsSelected])

  const allEntriesExist = (fieldsToCheck: string[]) => {
    const startingLength = fieldsToCheck.length
    const allExist = fieldsToCheck.filter((i: string) => i.trim().length > 0).length === startingLength
    return allExist
  }

  const csSelectOptions = useMemo(() => {
    const mapped = allVsacCS?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
    const defaultOption = mapped?.[0]
    setSelectedCodeSystemBase(defaultOption)
    return mapped
  }, [allVsacCS])

  const flattenCodesBySystem = useMemo(() => {
    const result = [] as FlattenedCodeWithSystem[]
    if (!codesBySystemToAdd) {
      return result
    }
    const keys = Object.keys(codesBySystemToAdd) || []
    keys.forEach(k => {
      const name = csSelectOptions.find(o => o.value === k)?.label as string
      return codesBySystemToAdd[k].forEach(dataItem => {
        result.push({ system: k, name, ...dataItem })
      })
    })
    return result
  }, [codesBySystemToAdd])

  const handleDeleteCodeFromStaging = () => {
    let codeItems = {} as CodesBySystemToAdd
    setCodesBySystemToAdd(cs => {
      const systemUrls = Object.keys(cs)
      systemUrls.forEach((url: string) => {
        const stagedValuesToDelete = selectedStagingRows?.filter((k) => k.system === url)
        const filteredValues = codesBySystemToAdd[url]?.filter(c => !stagedValuesToDelete.find(v => v.code === c.code))
        if (filteredValues.length) {
          codeItems[url] = filteredValues
        }
      })
      return codeItems
    })
    // clear out checkboxes
    handleToggleClearStaged()
  }

  const handleChangeSelectedStagingRows = (r: SelectedRows) => {
    setSelectedStagingRows(r.selectedRows)
  }

  const programIdsToRemoveProvisionalVs = useMemo(() => provisionalContext?.filter((programItem: any) => {
    return programItem?.provisionalLeafs?.find((leaf: any) => {
      return leaf?.id === provisionalVsIdForUpdate
    })
  })?.map((p: any) => p?.programId) || [], [provisionalVsIdForUpdate, provisionalContext])

  const handleDeleteProvisionalVs = async (userConfirmedDelete = false) => {
    setLoading(true)
    const provVsUrl = provisionalVS?.find((vs: any) => vs.id === provisionalVsIdForUpdate)?.url

    if (!userConfirmedDelete) {
      setDeleteModalOpen(true)
      return
    }
    const result = await fetch('/api/valueset/provisional', {
      method: 'DELETE',
      body: JSON.stringify({ id: provisionalVsIdForUpdate, url: provVsUrl, programIdsToUpdate: programIdsToRemoveProvisionalVs })
    })

    const json = await result.json()
    if (result.ok) {
      toast.success('Provisional value set deleted')
      updateServerFetchedData()
      setDeleteModalOpen(false)
    } else {
      toast.error('Failed to delete provisional value set')
      setLoading(false)
      console.error('error')
      console.error(json)
    }
    setLoading(false)
  }

  const stagingContextActions = useMemo(() => {
    return (
      <div>
        <Button
          text={`Clear`}
          style={{ marginRight: '.5rem', backgroundColor: 'darkgray' }}
          onClick={handleToggleClearStaged}
        />
        <Button
          text={`Delete from Staging`}
          onClick={handleDeleteCodeFromStaging}
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>
    )
  }, [selectedStagingRows])

  const valueSetMetadataErrorExists = useMemo(() => {
    return (titleError?.isValid === false || authorError?.isValid === false || stewardError?.isValid === false)
  }, [titleError, authorError, stewardError])

  const codeErrorExists = useMemo(() => {
    return (codeError?.isValid === false || displayError?.isValid === false || definitionError?.isValid === false)
  }, [codeError, displayError, definitionError])

  const handleClickAddCode = () => {
    const clonedCodesBySystem = cloneDeep(codesBySystemToAdd)
    const currentSystem = selectedCodeSystemBase?.value!
    // add code to codesbysystem and then clear form
    setCodesBySystemToAdd(currentCodes => {
      // if the system does not exist, add the code
      if (!currentCodes[currentSystem]) {
        clonedCodesBySystem[currentSystem] = [{ code: codeToAdd, definition: definitionToAdd, display: displayToAdd }]
      } else {
        // if it does exist, override details if code exists (maybe notify eventually?) add if doesn't
        const updatedCodes = uniqBy([
          { code: codeToAdd, definition: definitionToAdd, display: displayToAdd },
          ...clonedCodesBySystem[currentSystem]
        ], 'code')
        clonedCodesBySystem[currentSystem] = updatedCodes
      }
      clearCodeData()
      return clonedCodesBySystem
    })
  }

  const clearCodeData = () => {
    setCodeToAdd('')
    setDefinitionToAdd('')
    setDisplayToAdd('')
  }

  const clearAllFields = () => {
    setTitle('')
    setAuthor('')
    setSteward('')
    setCodesBySystemToAdd({})
    setProvisionalVsIdForUpdate(undefined)
    clearCodeData()
    setShowVsForm(false)
  }

  const updateServerFetchedData = () => {
    mutateProvContext()
    mutateProvCs()
    mutateProvVs()
  }

  const handleProvisionalVsUpdate = async () => {
    setLoading(true)
    // identify urls of all codesystems that don't exist yet
    const newCsUrls = Object.keys(codesBySystemToAdd).filter(system => !provisionalCS?.find((cs: fhir4.CodeSystem | undefined) => cs?.url === system))
    const newNameUrlPairs = csSelectOptions?.filter(o => newCsUrls.includes(o.value))
    const submitBody = {
      newCodeSystemItems: newNameUrlPairs,
      codesBySystemToAdd,
      title,
      author,
      steward,
      provisionalVsIdForUpdate
    }

    const result = await fetch('/api/valueset/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })

    if (result.ok) {
      toast.success(`Provisional value set ${provisionalVsIdForUpdate ? 'updated' : 'created'}`)
      updateServerFetchedData()
      setLoading(false)
      clearAllFields()
    } else {
      setLoading(false)
      toast.error(`Failed to ${provisionalVsIdForUpdate ? 'update' : 'create'} provisional value set`)
    }
  }

  return (
    <div>
      <PageTitle style={{ marginBottom: '1rem' }}>{`${!can(session, 'edit') ? 'View' : 'Create or Edit'} VSM Provisional Value Sets`}</PageTitle>
      {can(session, 'edit') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button
            text='+ Create New VS'
            onClick={handleClickNewVS}
            disabled={Boolean(provisionalVsIdForUpdate)}
          />
        </div>
      )}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-modal-modal-title"
        aria-describedby="delete-modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="delete-modal-modal-title" variant="h6" component="h2">
            Confirm: Delete Provisional Value Set
          </Typography>
          <Typography id="delete-modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            {`This Value Set is ${programIdsToRemoveProvisionalVs.length ? '' : 'not '}currently being used in programs within the VSM.`}
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2, display: 'inline-block', mb: 1 }}>
            {`${programIdsToRemoveProvisionalVs.length
              ? 'By deleting this Value Set, you will also delete references to it from all programs and groupers.'
              : 'You will not be able to recover this Value Set once it is deleted.'}`
            }

          </Typography>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Button
              onClick={() => {
                setLoading(false)
                setDeleteModalOpen(false)
              }}
              style={{ backgroundColor: 'darkgray' }}
              text='Cancel'
            />
            <Button onClick={async () => await handleDeleteProvisionalVs(true)} text='Continue' />
          </div>
        </Box>
      </Modal>
      <ErrorMessage error={provVsError} />
      <ErrorMessage error={provContextError} />
      <DataTable
        title={`${!can(session, 'edit') ? 'View' : 'Select to Edit'} Existing Provisional Value Sets`}
        expandableRows={true}
        expandableRowsComponent={CodeDetailsExpanded}
        selectableRows={true}
        selectableRowsSingle={true}
        data={provisionalVS || []}
        selectableRowSelected={defaultSelectedRows}
        // @ts-ignore
        columns={existingProvisionalVsColumns}
        onSelectedRowsChange={(e) => {
          const vsId = e?.selectedRows?.[0]?.id
          if (vsId) {
            setShowVsForm(true)
          }
          setProvisionalVsIdForUpdate(vsId)
        }}
        noDataComponent={<NoDataComponent />}
      />
      {showVsForm && can(session, 'edit') && (
        <div style={{ marginTop: '2rem' }}>
          <h4>{provisionalVsIdForUpdate ? 'Update ' : 'Create New '}Provisional Value Set</h4>
          <p>Provisional VS Metadata (required):</p>
          <QuestionnaireRowContainer style={{ marginTop: '0.5rem' }}>
            <TextArea
              label='Title'
              required={true}
              readonly={!can(session, 'edit')}
              style={{ minWidth: '20rem' }}
              value={title}
              onChange={(e) => {
                const titleErrorResult = isValidString(e.target.value)
                setTitleError(titleErrorResult)
                setTitle(e.target.value)
              }}
              errorMessage={titleError?.message}
            />
            <TextArea
              label='Author'
              readonly={!can(session, 'edit')}
              required={true}
              style={{ minWidth: '20rem' }}
              value={author}
              onChange={(e) => {
                const authorErrorResult = isValidString(e.target.value)
                setAuthorError(authorErrorResult)
                setAuthor(e.target.value)
              }}
              errorMessage={authorError?.message}
            />
            <TextArea
              label='Steward'
              readonly={!can(session, 'edit')}
              required={true}
              style={{ minWidth: '20rem' }}
              value={steward}
              onChange={(e) => {
                const stewardErrorResult = isValidString(e.target.value)
                setStewardError(stewardErrorResult)
                setSteward(e.target.value)
              }}
              errorMessage={stewardError?.message}
            />
          </QuestionnaireRowContainer>
          {allEntriesExist([title, author, steward]) && !valueSetMetadataErrorExists && (
            <div>
              <p>Select a Code System URL to create new or edit existing VSM Provisional Code System</p>
              <QuestionnaireRowContainer style={{ marginBottom: '2rem' }}>
                <Select
                  isClearable={false}
                  options={csSelectOptions}
                  isMulti={false}
                  value={selectedCodeSystemBase}
                  menuPortalTarget={myDocument}
                  styles={reactSelectOptionStyle({ minWidth: '30rem' })}
                  onChange={(e) => {
                    setSelectedCodeSystemBase(e)
                  }}
                />
              </QuestionnaireRowContainer>
              <ErrorMessage error={provCsError} />
              {existingProvisionalCs?.provisionalCS?.length ? (
                <div>
                  <p>A provisional code system exists in VSM for {selectedCodeSystemBase?.label} containing the following codes:</p>
                  <ExistingCodesTable
                    systemName={selectedCodeSystemBase?.label!}
                    codeSystem={existingProvisionalCs?.provisionalCS?.find((c: fhir4.CodeSystem | undefined) => c?.url === selectedCodeSystemBase?.value)!}
                    handleAddCodes={handleUpdateStaging}
                  />
                  <p style={{ marginBottom: '1rem' }}>You may add custom provisional codes to your code system below:</p>
                </div>
              ) : (
                <NoProvVsWrapper style={{ flexDirection: 'column', flexWrap: 'nowrap', textAlign: 'center', marginBottom: '2rem' }}>
                  <p style={{ marginBottom: 0 }}>{`No existing VSM Provisional Code Systems found for ${selectedCodeSystemBase?.label}.`}</p>
                  <p>{`Create one by adding code items below.`}</p>
                </NoProvVsWrapper>
              )}
              {selectedCodeSystemBase && (
                <div>
                  <p>{`Add New Codes to ${selectedCodeSystemBase.label} to include in your Value Set`}</p>
                  <QuestionnaireRowContainer>
                    <SearchInput
                      label='Code'
                      required={true}
                      onChange={(e) => {
                        const codeErrorResult = isValidCode(e.target.value)
                        setCodeError(codeErrorResult)
                        // handle empty string case
                        setCodeToAdd(e.target.value)
                      }}
                      value={codeToAdd}
                      style={{ minWidth: '20rem' }}
                      errorMessage={codeError?.message}
                    />
                    <SearchInput
                      label='Display'
                      required={true}
                      onChange={(e) => {
                        const displayErrorResult = isValidString(e.target.value)
                        setDisplayError(displayErrorResult)
                        setDisplayToAdd(e.target.value)
                      }}
                      value={displayToAdd}
                      style={{ minWidth: '20rem' }}
                      errorMessage={displayError?.message}
                    />
                    <TextArea
                      label='Definition (more detail about this code)'
                      required={true}
                      onChange={(e) => {
                        const definitionErrorResult = isValidString(e.target.value)
                        setDefinitionError(definitionErrorResult)
                        setDefinitionToAdd(e.target.value)
                      }}
                      value={definitionToAdd}
                      style={{ minWidth: '20rem' }}
                      errorMessage={definitionError?.message}
                    />
                  </QuestionnaireRowContainer>
                  {
                    allEntriesExist([codeToAdd, displayToAdd, definitionToAdd]) && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '1rem' }}>
                        <Button
                          text={`+ Add Code to ${selectedCodeSystemBase.label}`}
                          onClick={handleClickAddCode}
                          disabled={codeErrorExists}
                        />
                      </div>
                    )
                  }
                </div>
              )}
              {codesBySystemToAdd && Object.keys(codesBySystemToAdd) && (
                <div>
                  <p>Your VSM Provisional Value Set will contain the following codes:</p>
                  <DataTable
                    progressPending={isCsLoading}
                    contextActions={stagingContextActions}
                    pagination
                    selectableRows={true}
                    selectableRowsNoSelectAll
                    title='Staged Codes to be Added'
                    data={flattenCodesBySystem || []}
                    columns={stagedCodeColumns}
                    clearSelectedRows={clearStagedCodes}
                    onSelectedRowsChange={(r) => handleChangeSelectedStagingRows(r)}
                  />
                </div>
              )}
            </div>

          )}
          {
            allEntriesExist([title, author, steward]) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '1rem' }}>
                <Button
                  text={`${provisionalVsIdForUpdate ? 'Update' : 'Create'} Provisional Value Set`}
                  onClick={handleProvisionalVsUpdate}
                  disabled={provisionalVsIdForUpdate ? !changesExistForExistingVs : !flattenCodesBySystem.length}
                  loading={loading}
                />
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}

export default ProvisionalVSEdit