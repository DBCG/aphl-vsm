import { Button } from '@/components/buttons/Button'
import Select from 'react-select'
import { useEffect, useMemo, useState } from 'react'
import DataTable from 'react-data-table-component'
import { TextArea } from '@/components/TextArea'
import styled from 'styled-components'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { uniqBy } from 'lodash'
import { cloneDeep } from 'lodash'
import { useRouter } from 'next/router'
import { SearchInput } from '@/components/SearchInput'
import { PageTitle } from '@/components/Typography'
import { useSession } from 'next-auth/react'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { useGetProvisionalContext } from '@/hooks/useGetProvisionalContext'
import Link from 'next/link'
import { Chip } from '@mui/material'
import { ArrowOutward } from '@mui/icons-material'
import { is } from '@/helpers/is'

interface CodeDetailsProp {
  data: fhir4.ValueSet
}

interface RowItem {
  system: string
  code: string
  display: string
}

type ProvisionalVSetsByProgramId = Record<string, string[]>

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

const ExistingCodesTable = ({ systemName, codeSystem, handleAddCodes }: ExistingCodesTbl) => {
  const [selectedRows, setSelectedRows] = useState([])
  const [toggledClearRows, setToggledClearRows] = useState(false)

  const handleChangeSelectedRows = ({ selectedRows: rows }) => {
    setSelectedRows(rows)
  }

  const handleClear = () => setToggledClearRows(t => !t)

  const handleAdd = () => {
    handleAddCodes({ [codeSystem.url]: [...selectedRows] }, 'add')
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
        selector: (row: fhir4.CodeSystemConcept) => row.code,
      },
      {
        name: 'Display',
        selector: (row: fhir4.CodeSystemConcept) => row.display,
      },
      {
        name: 'Definition',
        selector: (row: fhir4.CodeSystemConcept) => row.definition,
        minWidth: '20rem',
        cell: (row: fhir4.CodeSystemConcept) => (<p>{row.definition}</p>)
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
      data={codeSystem?.concept || []}
      // @ts-ignore
      columns={columns}
      onSelectedRowsChange={(r) => handleChangeSelectedRows(r)}
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
  const codesBySystem = data?.compose?.include
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
      pagination
      customStyles={customExpandStyles}
      data={codesBySystem}
      columns={columns}
    />
  )
}

const ProvisionalVSEdit = () => {
  // get existing prov valuesets + codesystems
  const { provisionalVS, isVsLoading } = useGetProvisionalVS()
  const { provisionalCS, isCsLoading } = useGetProvisionalCS()
  const [showVsForm, setShowVsForm] = useState(false)
  const [selectedVS, setSelectedVS] = useState<null | fhir4.ValueSet>(null)
  const [provisionalVsIdForUpdate, setProvisionalVsIdForUpdate] = useState<string | undefined>(undefined)
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState(undefined)
  // staging table
  const [selectedStagingRows, setSelectedStagingRows] = useState([])
  const [clearStagedCodes, setClearStagedCodes] = useState(false)
  // NOTE! provisional value sets are not associated with conditions at this point

  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)
  const existingProvisionalCs = useGetProvisionalCS({ systemUrl: selectedCodeSystemBase?.value })
  const allVsacCS = useGetCS(false)
  const { provisionalContext, isContextLoading } = useGetProvisionalContext()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  // valueset details
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [steward, setSteward] = useState('')

  // add these in a useEffect?
  const defaultTitle = selectedVS?.title || ''
  const defaultAuthor = selectedVS?.extension?.find(ext => ext?.url?.endsWith('/valueset-author'))?.valueContactDetail?.name || ''
  const defaultSteward = selectedVS?.extension?.find(ext => ext?.url?.endsWith('/valueset-steward'))?.valueContactDetail?.name || ''

  // codes to add in a-la-carte code form
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')

  const [codesBySystemToAdd, setCodesBySystemToAdd] = useState({})
  const [formContext, setFormContext] = useState(null)

  // loading + error state
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)

  type CodesBySystem = Record<string, string[]>

  const handleToggleClearStaged = () => setClearStagedCodes((c: boolean) => !c)
  const router = useRouter()

  const programsContainingProvisional = useMemo(() => {
    setError(null)
    if (!provisionalContext) return {}
    if (is.errorObj(provisionalContext)) {
      setError(provisionalContext.error)
      return {} 
    } else {
      const allProgramIds = provisionalContext.map(i => i.programId as string)
      const provVsByProgram = allProgramIds.reduce((acc, id) => {
        const allVsets = uniqBy(provisionalContext
          ?.find(c => c?.programId === id)?.groupers
          ?.map(g => g.provisionalLeafData)?.flat()?.filter(x => Boolean(x)) || [], 'provisionalLeafId')
  
        const result = Object.assign(acc, { [id]: allVsets })
        return result
      }, {})
  
      return provVsByProgram
    }
  }, [provisionalContext]) as ProvisionalVSetsByProgramId

  const findProgramByProvisionalLeaf = (leafUrlToFind) => {
    const programIds = Object.keys(programsContainingProvisional)
      .filter(programId => programsContainingProvisional[programId]
        .find(i => i.provisionalLeafUrl === leafUrlToFind))

    return programIds
  }

  const handleUpdateStaging = (codesBySystemToUpdate: CodesBySystem, action: 'add' | 'remove') => {
    let currentCodesToAdd = cloneDeep(codesBySystemToAdd)
    const systems = Object.keys(codesBySystemToUpdate)
    systems.forEach(system => {
      if (action === 'add') {
        if (!currentCodesToAdd[system]) {
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
    const matchingVs = provisionalVS?.find(vs => vs?.id === provisionalVsIdForUpdate)
    const defaultTitle = matchingVs?.title || ''
    const defaultAuthor = matchingVs?.extension?.find(ext => ext?.url?.endsWith('/valueset-author'))?.valueContactDetail?.name || ''
    const defaultSteward = matchingVs?.extension?.find(ext => ext?.url?.endsWith('/valueset-steward'))?.valueContactDetail?.name || ''
    setTitle(defaultTitle)
    setAuthor(defaultAuthor)
    setSteward(defaultSteward)
  }, [provisionalVsIdForUpdate])

  const existingProvisionalVsColumns = useMemo(() => {
    const fields = [
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
          const systems = row?.compose?.include?.map(ci => ci.system) || []
          return (
            <div>
              {systems.map(s => <p key={s}>{s}</p>)}
            </div>
          )
        }
      },
      {
        name: 'Provisional Value Set is used in program(s) with IDs',
        cell: (row: fhir4.ValueSet) => {
          const programIdsWithProvisionals = findProgramByProvisionalLeaf(row.url)
          if (programIdsWithProvisionals.length) {
            const results = programIdsWithProvisionals.map(id => {
              return (
                  <Chip target="_blank" icon={<ArrowOutward />} component='a' label={id} href={`/programs/${id}`} clickable={true}/>
              )
            })
            return (
              <div style={{ display: 'flex', gap: '.8rem' }}>
                { results }
              </div>
            )
          }
          return null
        }
      }
    ]

    return fields
  }, [provisionalVS, provisionalContext])

  const stagedCodeColumns = useMemo(() => {
    const fields = [
      {
        name: 'System',
        selector: (row: fhir4.ValueSet) => row.name!,
        maxWidth: '10rem',
      },
      {
        name: 'Code',
        selector: (row: fhir4.ValueSet) => row.code,
      },
      {
        name: 'Display',
        selector: (row: fhir4.ValueSet) => row.display,
      },
      {
        name: 'Definition',
        selector: (row: fhir4.ValueSet) => row.definition,
      }
    ]

    return fields
  }, [codesBySystemToAdd])

  const handleClickNewVS = () => {
    setFormContext('new')
    setProvisionalVsIdForUpdate(undefined)
    setShowVsForm(true)
  }

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
    if (!codesBySystemToAdd) {
      return []
    }
    const keys = Object.keys(codesBySystemToAdd) || []
    const result = []
    keys.forEach(k => {
      const name = csSelectOptions.find(o => o.value === k)?.label
      return codesBySystemToAdd[k].forEach(dataItem => {
        result.push({ system: k, name, ...dataItem })
      })
    })
    return result
  }, [codesBySystemToAdd])

  const handleDeleteCodeFromStaging = () => {
    let codeItems = {}
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

  const handleChangeSelectedStagingRows = (r) => {
    setSelectedStagingRows(r.selectedRows)
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
        />
      </div>
    )
  }, [selectedStagingRows])

  const handleClickAddCode = () => {
    const clonedCodesBySystem = cloneDeep(codesBySystemToAdd)
    const currentSystem = selectedCodeSystemBase.value
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
      return clonedCodesBySystem
    })
  }

  const handleProvisionalVsUpdate = async () => {
    setLoading(true)
    // identify urls of all codesystems that don't exist yet
    const newCsUrls = Object.keys(codesBySystemToAdd).filter(system => !provisionalCS?.find(cs => cs.url === system))
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

    const json = await result.json()
    if (result.ok) {
      router.push(`/programs?resourceType=provisional`)
    } else {
      setLoading(false)
      console.error('error')
      console.error(json)
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
      <DataTable
        title={`${!can(session, 'edit') ? 'View' : 'Select to Edit'} Existing Provisional Value Sets`}
        pagination={true}
        expandableRows={true}
        expandableRowsComponent={CodeDetailsExpanded}
        selectableRows={can(session, 'edit')}
        selectableRowsSingle={true}
        data={provisionalVS || []}
        // @ts-ignore
        columns={existingProvisionalVsColumns}
        onSelectedRowsChange={(e) => {
          const vsId = e?.selectedRows?.[0]?.id
          if (vsId) {
            setFormContext(null)
            setShowVsForm(true)
          }
          setProvisionalVsIdForUpdate(vsId)
        }}
        noDataComponent={<NoDataComponent />}
      />
      {showVsForm && (
        <div style={{ marginTop: '2rem' }}>
          <h4>{provisionalVsIdForUpdate ? 'Update ' : 'Create New '}Provisional Value Set</h4>
          <p>Provisional VS Metadata (required):</p>
          <QuestionnaireRowContainer style={{ marginTop: '0.5rem' }}>
            <TextArea
              label='Title'
              required={true}
              style={{ minWidth: '20rem' }}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
            <TextArea
              label='Author'
              required={true}
              style={{ minWidth: '20rem' }}
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value)
              }}
            />
            <TextArea
              label='Steward'
              required={true}
              style={{ minWidth: '20rem' }}
              value={steward}
              onChange={(e) => {
                setSteward(e.target.value)
              }}
            />
          </QuestionnaireRowContainer>
          {allEntriesExist([title, author, steward]) && (
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
              {existingProvisionalCs?.provisionalCS?.length ? (
                <div>
                  <p>A provisional code system exists in VSM for {selectedCodeSystemBase?.label} containing the following codes:</p>
                  <ExistingCodesTable
                    systemName={selectedCodeSystemBase?.label}
                    codeSystem={existingProvisionalCs?.provisionalCS?.find(c => c.url === selectedCodeSystemBase?.value)}
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
                      onChange={(e) => {
                        // handle empty string case
                        setCodeToAdd(e.target.value)
                      }}
                      value={codeToAdd}
                      style={{ minWidth: '20rem' }}
                    />
                    <SearchInput
                      label='Display'
                      onChange={(e) => setDisplayToAdd(e.target.value)}
                      value={displayToAdd}
                      style={{ minWidth: '20rem' }}
                    />
                    <TextArea
                      label='Definition (more detail about this code)'
                      onChange={(e) => setDefinitionToAdd(e.target.value)}
                      value={definitionToAdd}
                      style={{ minWidth: '20rem' }}
                    />
                  </QuestionnaireRowContainer>
                  {
                    allEntriesExist([codeToAdd, displayToAdd, definitionToAdd]) && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '1rem' }}>
                        <Button
                          text={`+ Add Code to ${selectedCodeSystemBase.label}`}
                          onClick={handleClickAddCode}
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
                  text={`${provisionalVsIdForUpdate ? 'Update' : 'Create'} Provisional Value Set: "${title}"`}
                  onClick={handleProvisionalVsUpdate}
                  disabled={!flattenCodesBySystem.length}
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