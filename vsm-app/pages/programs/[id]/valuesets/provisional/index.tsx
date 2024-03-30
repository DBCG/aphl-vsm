import { ManifestUrlNameMap, SystemSelection } from '@/types/manifestTypes'
import { useEffect, useMemo, useState } from 'react'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { TextArea } from '@/components/TextArea'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { GroupOptionItem, buildGroupOptions } from '@/helpers/selectHelpers'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import ProvisionalVsDescription from '@/components/ProvisionalVS/ProvisionalVsDescription'
import { Step, StepLabel, Stepper, StepContent, IconButton } from '@mui/material'
import styled from 'styled-components'
import { DeleteForeverSharp } from '@mui/icons-material'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { Result, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StyledChip } from '@/components/data-display/Chips'
import { SelectInputContainer } from '@/components/ProgramValueSetDetails/styles'
import { Condition, buildConditionOptions } from '@/helpers/conditionHelpers'
import { useGetConditions } from '@/hooks/useGetConditions'
import { getVSConditions } from '@/helpers/libraryHelpers'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'

// handler for when to show button rows?
interface CodeTableData {
  code: string
  display: string
  definition: string
}

const generateConditionOptions = (conditionsMap, vsUrl) => {
  const vsConditions = conditionsMap[vsUrl] || []
  const selectedOptions = vsConditions
  ?.map((i) => {
    const system = i?.valueCodeableConcept?.coding?.[0]?.system
    const code = i?.valueCodeableConcept?.coding?.[0]?.code
    const systemCodeText = system && code ? `Code ${code} in system ${system}` : null
    return {
      label: i?.valueCodeableConcept?.text || systemCodeText || '[missing condition text]',
      value: {
        system: system || '',
        code: code || '',
        version: i?.valueCodeableConcept?.coding?.[0]?.version || '',
        text: i?.valueCodeableConcept?.text
      }
    }
  })
  .filter((x) => x) as Condition[]
  return selectedOptions
} 

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
        <p>No Provisional Codes have ben added to this Value Set</p>
      </div>
    )
  }
}

const allFieldsExist = (codeItems: string[]) => {
  const filtered = codeItems.filter(i => i.trim() !== '')
  // check if vals are even valid
  const allFieldsPopulated = filtered.length === 3
  return allFieldsPopulated
}

const ContentWrapper = styled.div`
  display: flex;
  margin-left: 2.1rem;
  flex-grow: 1;
`

const NoProvVsWrapper = styled.div`
  display: flex;
  padding: .8em 2em;
  justify-content: center;
  border: 1px solid var(--theme-300);
  background-color: white;
  flex-grow: 1;
`

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

const customBaseStyles = {
	headCells: {
		style: {
      fontWeight: 'bold',
      textDecoration: 'underline'
		},
	}
}

interface RowItem {
  system: string
  code: string
  display: string
}

const CodeDetailsExpanded = ({ data }) => {
  
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
    <DataTable customStyles={customExpandStyles} data={codesBySystem} columns={columns}/>
  )
}

const ExistingCodesTable = ({ codeSystem }) => {

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
  }, [codeSystem])

  return (
    <DataTable customStyles={customBaseStyles} data={codeSystem?.concept || []} columns={columns}/>
  )
}

const ProvisionalVS = () => {
  const [allSystemSelections, setAllSystemSelections] = useState<SystemSelection[]>([])
  const [provisionalVsIdForUpdate, setProvisionalVsIdForUpdate] = useState<string | undefined>(undefined)
  const [codeItemsToAdd, setCodeItemsToAdd] = useState([] as fhir4.CodeSystemConcept[])
  const [currentCodeItem, setCurrentCodeItem] = useState({})
  const [enableAdd, setEnableAdd] = useState(false)
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState(undefined)
  const [groupersToAdd, setGroupersToAdd] = useState<GroupOptionItem[]>([])
  const [updatedConditions, setUpdatedConditions] = useState<Condition[]>([])
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')
  const [submittingForm, setSubmittingForm] = useState(false)

  // valueset details
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [steward, setSteward] = useState('')

  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)

  const provisionalVs = useGetProvisionalVS()
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false, false, false, false])
  const [activeStep, setActiveStep] = useState(0)
  const router = useRouter()
  const programId = router.query.id as string
  const program = useGetProgramById({ programId })
  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(program?.id ? `/api/programs/${program?.id}/manifest` : null, fetcher, { revalidateOnFocus: true })

  const { programAndGrouperData } = useGetProgramDetails({ id: programId })

  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId,
    provisionalOnly: false
  }) as Result

  const allConditions = useGetConditions()

  const conditionsMap = useMemo(() => {
    if(programAndGrouperData?.program) {
      return getVSConditions(programAndGrouperData?.program)
    } else {
      return {}
    }
  }, [programAndGrouperData?.program])

  const groupsInProgram = progValueSetDets?.groupsInProgram

  const handleDelete = (item: CodeTableData) => {
    const filteredItems = codeItemsToAdd?.filter(i => !(i?.code === item.code))
    setCodeItemsToAdd(filteredItems)
  }

  const handleCheckForSubmitErrors = (submitContext: 'vs-add' | 'vs-update') => {
    if (submitContext === 'vs-add') {
      return !Boolean(
        groupersToAdd?.length &&
        codeItemsToAdd?.length &&
        selectedCodeSystemBase &&
        author?.length &&
        steward?.length &&
        title?.length
      )
    }
  }

  const existingProvisionalCs = useGetProvisionalCS({ systemUrl: selectedCodeSystemBase?.value })

  const codeColumns = useMemo(() => {
    const fields = [
      {
        name: 'Delete',
        selector: (row: CodeTableData) => row.code!,
        maxWidth: '4rem',
        cell: (row: CodeTableData) => (
          <IconButton
            onClick={() => handleDelete(row)}
          >
            <DeleteForeverSharp color='error' />
          </IconButton>
        )
      },
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
      }
    ]

    return fields
  }, [codeItemsToAdd])

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
              {systems.map(s => <p>{s}</p>)}
            </div>
          )}
      }
    ]

    return fields
  }, [provisionalVs])

  useEffect(() => {
    // this sets up all of the default data for state if the provisional vs exists
    const matchingVs = provisionalVs?.find(vs => vs?.id === provisionalVsIdForUpdate)
    const defaultTitle = matchingVs?.title || ''
    const defaultAuthor = matchingVs?.extension?.find(ext => ext?.url?.endsWith('/valueset-author'))?.valueContactDetail?.name || ''
    const defaultSteward = matchingVs?.extension?.find(ext => ext?.url?.endsWith('/valueset-steward'))?.valueContactDetail?.name || ''
    const existingGrouperIds = progValueSetDets?.data?.find(i => i?.valueSet?.id === provisionalVsIdForUpdate)?.groups?.map(g => g.id) || []

    if (existingGrouperIds) {
      // get existing groupers
      const initialDefaultGroupers = groupsInProgram?.filter(g => existingGrouperIds?.includes(g.id))
      const result = buildGroupOptions(initialDefaultGroupers) || []
      setGroupersToAdd(result)
      // get existing conditions
      const existingConditions = generateConditionOptions(conditionsMap, matchingVs?.url!)
      setUpdatedConditions(existingConditions)
    }
    // this is assuming only one CS is possible to add in a vs
    const selectedCSBaseUrl = matchingVs?.compose?.include?.[0]?.system
    const selectedCs = allSystemSelections?.find(s => s?.uri === selectedCSBaseUrl)
    const selectionItem = selectedCs ? { value: selectedCs.uri, label: selectedCs.name } : null

    setTitle(defaultTitle)
    setAuthor(defaultAuthor)
    setSteward(defaultSteward)
    setSelectedCodeSystemBase(selectionItem)
  }, [provisionalVsIdForUpdate, programAndGrouperData])

  const clearCurrentCodeItems = () => {
    setCodeToAdd('')
    setDefinitionToAdd('')
    setDisplayToAdd('')
  }

  const handleStep = (direction: 'next' | 'prev', currentIndex: number) => {
    const stepsCompletedClone = [...stepsCompleted]
    if (direction === 'next') {
      stepsCompletedClone[currentIndex] = true
      setStepsCompleted(stepsCompletedClone)
      setActiveStep(a => a + 1)
    } else {
      stepsCompletedClone[currentIndex] = false
      setStepsCompleted(stepsCompletedClone)
      setActiveStep(a => a - 1)
    }
  }

  const handleSubmitForm = async () => {
    setSubmittingForm(true)
    const codesBySystemToAdd = { [selectedCodeSystemBase?.value as string]: codeItemsToAdd }

    const submitBody = {
      programId,
      authorToUpdate: author,
      stewardToUpdate: steward,
      titleToUpdate: title,
      codesBySystemToAdd,
      updatedConditions,
      provisionalVsIdForUpdate: provisionalVsIdForUpdate,
      grouperIds: groupersToAdd?.map(g => g.id)
    }
    // block submit?
    const result = await fetch('/api/valueset/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })

    if (result.ok) {
      const json = await result.json()
      router.push(`/programs/${programId}/valuesets/${json.newId}`)
    }
  }

  useEffect(() => {
    setCodeItemsToAdd([])
    clearCurrentCodeItems()
  }, [selectedCodeSystemBase])

  const selectOptions = useMemo(() => {
    return allSystemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [allSystemSelections])

  useEffect(() => {
    const shouldEnable = allFieldsExist([codeToAdd, displayToAdd, definitionToAdd])
    setEnableAdd(shouldEnable)
  }, [Object.values(currentCodeItem)])

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  useEffect(() => {
    // Initializes the available CodeSystem Options from VSAC
    if (systemAndVersionData.length > 0) {
      setAllSystemSelections(systemAndVersionData)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
  }, [isLoading, systemAndVersionData, error])

  const handleAddToList = () => {
    setCodeItemsToAdd(prev => [
      ...prev,
      { code: codeToAdd, display: displayToAdd, definition: definitionToAdd }
  ])
    clearCurrentCodeItems()
  }

  const showValueSetStep = !enableAdd && codeItemsToAdd.length > 0

  const firstStep = !provisionalVs?.length ? (
    <div>
      <NoProvVsWrapper>No Existing VSM Provisional Value Sets found, create one below</NoProvVsWrapper>
      <ButtonRowContainer>
        <Button
          text='Next'
          onClick={(e) => handleStep('next', 0)}
        />
      </ButtonRowContainer>
    </div>
  ) : (
    <div>
      <p>
        Select Provisional Value Set for update or 
        <Button
          style={{ marginLeft: '.4rem' }}
          text='Create New Provisional VS'
          onClick={(e) => {
            setProvisionalVsIdForUpdate(undefined) 
            handleStep('next', 0)}
          }
        />
      </p>
      <DataTable
        pagination={true}
        expandableRows={true}
        expandableRowsComponent={CodeDetailsExpanded}
        selectableRows={true}
        selectableRowsSingle={true}
        data={provisionalVs}
        columns={existingProvisionalVsColumns}
        onSelectedRowsChange={(e) => {
          const vsId = e?.selectedRows?.[0]?.id
          setProvisionalVsIdForUpdate(vsId)
        }}
      />
      { provisionalVsIdForUpdate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button
            text='Next'
            onClick={(e) => handleStep('next', 0)}
          />
        </div>
      )}
    </div>
  )


  const secondStep = () => (
    <div>
      <QuestionnaireRowContainer>
        <TextArea
          label='Title'
          style={{ minWidth: '20rem' }}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
          }}
        />
        <TextArea
          label='Author'
          style={{ minWidth: '20rem' }}
          value={author}
          onChange={(e) => {
            setAuthor(e.target.value)
          }}
        />
        <TextArea
          label='Steward'
          style={{ minWidth: '20rem' }}
          value={steward}
          onChange={(e) => {
            setSteward(e.target.value)
          }}
        />
      </QuestionnaireRowContainer>
      <ButtonRowContainer>
        <Button
          text='Back'
          onClick={(e) => handleStep('prev', 1)}
        />
        {
          (Boolean(steward) && Boolean(author) && Boolean(title)) ? (
            <Button
              text='Next'
              onClick={(e) => handleStep('next', 1)}
            />
          ) : null
        }
      </ButtonRowContainer>
    </div>
  )

  const thirdStep = () => {
    const editingExistingVs = Boolean(provisionalVsIdForUpdate)
    return (
      <div>
        { editingExistingVs && (
          <>
            <p style={{ fontSize: '80%', marginBottom: 0 }}>The Value Set you are editing is based on the below code system.</p>
            <p style={{ fontSize: '80%', marginTop: '.4rem' }}>To extend a different code system, you must make a new Value Set.</p>
          </>
        )}
        <QuestionnaireRowContainer>
          <Select
            isClearable={true}
            isDisabled={editingExistingVs}
            options={selectOptions}
            isMulti={false}
            value={selectedCodeSystemBase}
            menuPortalTarget={myDocument}
            styles={reactSelectOptionStyle({ minWidth: '30rem' })}
            onChange={(e) => {
              setSelectedCodeSystemBase(e)
            }}
          />
        </QuestionnaireRowContainer>
        <ButtonRowContainer>
          <Button
            text='Back'
            onClick={(e) => handleStep('prev', 2)}
          />
          {selectedCodeSystemBase ? (
            <Button
              text='Next'
              onClick={(e) => handleStep('next', 2)}
            />
          ) : null}
        </ButtonRowContainer>

      </div>
    )
  }

  const fourthStep = (
    <div>
      <QuestionnaireRowContainer style={{ marginBottom: '1rem' }}>
        {existingProvisionalCs?.length ? (
          <div>
            <p>A provisional code system exists in VSM for {selectedCodeSystemBase?.label} containing the following codes:</p>
            <ExistingCodesTable codeSystem={existingProvisionalCs?.find(c => c.url === selectedCodeSystemBase?.value)}/>
            <p style={{ marginBottom: 0 }}>You may add more provisional codes to the system using the form below, which will add them to your Value Set.</p>
          </div>
        ) : (
          <NoProvVsWrapper style={{ flexDirection: 'column', flexWrap: 'nowrap', textAlign: 'center' }}>
            <p style={{ marginBottom: 0 }}>{`No existing VSM Provisional Code Systems found for ${selectedCodeSystemBase?.label}.`}</p>
            <p>{`Create one by adding code items below.`}</p>
          </NoProvVsWrapper>
        )}
      </QuestionnaireRowContainer>
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
      {selectedCodeSystemBase ? (
        <>
          {enableAdd && (
            <ButtonRowContainer>
              <Button
                text='Add to List'
                onClick={handleAddToList}
              />
            </ButtonRowContainer>
          )}
          <p>{`Code List to add: `}</p>
          <DataTable
            data={codeItemsToAdd}
            columns={codeColumns}
            noDataComponent={noDataComponent('setProvisionals')}
          />
          {(showValueSetStep || selectedCodeSystemBase) ? (
            <ButtonRowContainer>
              <Button
                text='Back'
                onClick={(e) => handleStep('prev', 3)}
              />
              <Button
                text='Next'
                onClick={(e) => handleStep('next', 3)}
              />
            </ButtonRowContainer>
          ) : (
            <ButtonRowContainer>
              <Button
                text='Back'
                onClick={(e) => handleStep('prev', 3)}
              />
            </ButtonRowContainer>
          )}
        </>
      ) : (
        <ButtonRowContainer>
          <Button
            text='Back'
            onClick={(e) => handleStep('prev', 3)}
          />
        </ButtonRowContainer>
      )}

    </div>
  )

  const fifthStep = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <QuestionnaireRowContainer>
          <Select
            styles={reactSelectOptionStyle({ minWidth: '30rem' })}
            required={true}
            defaultValue={groupersToAdd}
            onChange={
              (e) => {
                setGroupersToAdd(e)
              }
            }
            isMulti={true}
            // value={groupersToSearch}
            menuPortalTarget={myDocument}
            instanceId="grouper-selector"
            // @ts-ignore-next-line
            options={buildGroupOptions(groupsInProgram)}
          />
        </QuestionnaireRowContainer>
        <ButtonRowContainer>
          <Button
            text='Back'
            onClick={(e) => handleStep('prev', 4)}
          />
          {
            groupersToAdd.length ? (
              <Button
                text='Next'
                onClick={(e) => handleStep('next', 4)}
              />
            ) : null
          }
        </ButtonRowContainer>
      </div>
    )
  }

  const sixthStep = () => {
    return (
      <div>
        <SelectInputContainer id={`condition-selector`}>
          <Select
            menuPortalTarget={myDocument}
            menuPlacement={'bottom'}
            instanceId="condition-selector"
            isMulti={true}
            styles={reactSelectOptionStyle({ minWidth: '200px'})}
            options={buildConditionOptions(allConditions, updatedConditions)}
            value={updatedConditions}
            // TODO should block add if already exists
            onChange={(e) => {
              const conditionInfo = e as Condition[]
              setUpdatedConditions(conditionInfo)
            }}
          />
        </SelectInputContainer>
        <ButtonRowContainer>
              <Button
                text='Back'
                onClick={(e) => handleStep('prev', 5)}
              />
              <Button
                text='Next'
                onClick={(e) => handleStep('next', 5)}
              />
            </ButtonRowContainer>
      </div>
    )
  }

  const ReviewStep = () => {
    const existingProvisionalCodeSystem = existingProvisionalCs?.find(c => c.url === selectedCodeSystemBase?.value)
    return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <QuestionnaireRowContainer>
        <TextArea
          label='Title'
          style={{ minWidth: '20rem' }}
          value={title || 'No Title Set'}
          readonly={true}
        />
        <TextArea
          label='Author'
          style={{ minWidth: '20rem' }}
          value={author || 'No Author Set'}
          readonly={true}
        />
        <TextArea
          label='Steward'
          style={{ minWidth: '20rem' }}
          value={steward || 'No Steward Set'}
          readonly={true}
        />
      </QuestionnaireRowContainer>
      <QuestionnaireRowContainer>
        <TextArea
          label='Base Code System'
          style={{ minWidth: '50rem' }}
          value={selectedCodeSystemBase ? `${selectedCodeSystemBase?.label} (${selectedCodeSystemBase?.value})` : 'No Code System Base Selected'}
          readonly={true}
        />
      </QuestionnaireRowContainer>
      <div style={{ paddingLeft: '.8rem' }}>
        { existingProvisionalCodeSystem && (
          <div>
            <p>Provisional Codes Currently in this Value Set</p>
            <ExistingCodesTable codeSystem={existingProvisionalCodeSystem}/>
          </div>
        )}
        <p>Codes to be Added to Value Set</p>
        <DataTable
          data={codeItemsToAdd}
          columns={codeColumns.slice(1)}
        />
      </div>
      <div>
        <p>Associated Groupers</p>
         <div>
          {(groupersToAdd?.length ? groupersToAdd.map(i => <StyledChip experimental={false} style={{ margin: '.2rem', backgroundColor: 'white'}} label={i.label}/>) : <p>No Groupers Selected</p>)}
         </div>
        {
          activeStep === stepContents.length - 1 ? (
            <ButtonRowContainer>
              <Button
                text='Back to Edit'
                onClick={(e) => handleStep('prev', 5)}
              />
              {
                !handleCheckForSubmitErrors(selectedCodeSystemBase ? 'vs-update' : 'vs-add') ? (
                  <Button
                    loading={submittingForm}
                    text={`${selectedCodeSystemBase ? 'Update' : 'Add'} Provisional VS`}
                    onClick={() => handleSubmitForm()}
                  />
                ) : (<ErrorMessage error='All fields are required. Please complete missing fields in form.'/>)
              }
            </ButtonRowContainer>
          ): null
        }
      </div>
    </div>
  )}


  const stepContents = [
    {
      label: 'Create or Update a VSM Provisional Value Set',
      content: <ContentWrapper>{firstStep}</ContentWrapper>
    },
    {
      label: 'Update Value Set Details',
      content: <ContentWrapper>{secondStep()}</ContentWrapper>
    },
    {
      label: 'Choose a Code System to Extend as the base for your Provisional Value Set',
      content: <ContentWrapper>{thirdStep()}</ContentWrapper>
    },
    {
      label: `Add or Create Provisional Codes for Code System`,
      content: <ContentWrapper>{fourthStep}</ContentWrapper>
    },
    {
      label: 'Add Value Set to Grouper(s)',
      content: <ContentWrapper>{fifthStep()}</ContentWrapper>
    },
    {
      label: `Update associated Conditions for ${title || 'ValueSet'}`,
      content: <ContentWrapper>{sixthStep()}</ContentWrapper>
    },
    {
      label: 'Review Your Provisional Value Set',
      content: (
        <ContentWrapper>
          <ReviewStep />
        </ContentWrapper>
      )
    }
  ]

  return (
    <>
      <ProvisionalVsDescription />
      <div style={{ display: 'flex', alignContent: 'flex-start' }}>
        <Stepper orientation='vertical' activeStep={activeStep}>
          {stepContents.map((step, index) => {

            return (
              <Step key={index} completed={stepsCompleted[index]}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent TransitionProps={{ unmountOnExit: false }}>
                  {activeStep === index && step.content}
                </StepContent>
              </Step>
            )
          })}
        </Stepper>
      </div>
      {activeStep < stepContents.length - 1 && activeStep !== 0  ? (
        <ContentWrapper style={{ padding: '2rem 3rem', backgroundColor: 'lightBlue' }}>
          <ReviewStep/>
        </ContentWrapper>
      ) : (null)}
    </>
  )
}

export default ProvisionalVS