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
import { buildGroupOptions } from '@/helpers/selectHelpers'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { namesByUri } from '@/components/EditManifestDetails/manifestHelpers'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import ProvisionalVsDescription from '@/components/ProvisionalVS/ProvisionalVsDescription'
import { Step, StepLabel, Stepper, StepContent, IconButton, ButtonBase } from '@mui/material'
// import { IconButton } from '@/components/buttons/IconButton'
import styled from 'styled-components'
import { DeleteForeverSharp } from '@mui/icons-material'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { Result, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { ErrorMessage } from '@/components/ErrorMessage'

// handler for when to show button rows?
interface CodeTableData {
  code: string
  display: string
  definition: string
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

const ProvisionalVS = () => {
  const [pageLoading, setPageLoading] = useState(false)
  const [allSystemSelections, setAllSystemSelections] = useState<SystemSelection[]>([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [systemNamesByUri, setSystemNamesByUri] = useState<ManifestUrlNameMap>({})
  const [provisionalVsets, setProvisionalVsets] = useState([])
  const [codeItemsToAdd, setCodeItemsToAdd] = useState([] as fhir4.CodeSystemConcept[])
  const [currentCodeItem, setCurrentCodeItem] = useState({})
  const [enableAdd, setEnableAdd] = useState(false)
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState(undefined)
  const [groupersToAdd, setGroupersToAdd] = useState([])
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
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false, false, false])
  const [activeStep, setActiveStep] = useState(0)
  const router = useRouter()
  const programId = router.query.id as string
  const program = useGetProgramById({ programId })
  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(program?.id ? `/api/programs/${program?.id}/manifest` : null, fetcher, { revalidateOnFocus: false })

  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId,
    provisionalOnly: false
  }) as Result

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

  const existingProvisionalCs = useGetProvisionalCS({ systemUrl: selectedCodeSystemBase })

  const columns = useMemo(() => {
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
      },
      // {
      //   name: 'Groupers',
      //   selector: (row: TableData) => row.version!,
      //   sortable: true,
      //   wrap: true,
      //   maxWidth: '150px'
      // }
    ]

    return fields
  }, [codeItemsToAdd])

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

  interface vsData {
    title: string
    author: string
    steward: string
  }

  interface csData {

  }

  const handleSubmitForm = async () => {
    setSubmittingForm(true)
    console.log('selectedCodeSystemBase: ', selectedCodeSystemBase)
    const codesBySystemToAdd = { [selectedCodeSystemBase.value as string]: codeItemsToAdd }

    const submitBody = {
      authorToUpdate: author,
      stewardToUpdate: steward,
      titleToUpdate: title,
      codesBySystemToAdd,
      grouperIds: groupersToAdd?.map(g => g.id)
    }
    // block submit?
    await fetch('/api/valueset/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })
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
      const sysNamesByUri = namesByUri(systemAndVersionData)

      // comment out until fix
      setSystemNamesByUri(sysNamesByUri)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
    setPageLoading(isLoading)
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
    // CREATE A TABLE WITH SELECT
    <div>Provisional Value Sets found:
      <p>Select Provisional VS for update, or <Button text='Create New Provisional VS' /></p>
      {/* get the provisional VS ID from here if exist */}
      {provisionalVs?.map(p => <>{p.title}</>)}
    </div>
  )


  const secondStep = (
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

  const thirdStep = (
    <div>
      <QuestionnaireRowContainer>
        <Select
          isClearable={true}
          options={selectOptions}
          isMulti={false}
          value={selectedCodeSystemBase}
          // defaultValue={selectOptions[0]}
          menuPortalTarget={myDocument}
          styles={reactSelectOptionStyle({ minWidth: '30rem' })}
          onChange={(e) => {
            console.log('e: ', e)
            setSelectedCodeSystemBase(e)
          }}
        // getOptionValue={(option) => option.label}
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

  const fourthStep = (
    <div>
      <QuestionnaireRowContainer style={{ marginBottom: '2rem' }}>
        {existingProvisionalCs?.length ? (
          <p>cs exists</p>
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
            columns={columns}
            noDataComponent={noDataComponent('setProvisionals')}
          />
          {showValueSetStep ? (
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

  const fifthStep = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <QuestionnaireRowContainer>
        <Select
          styles={reactSelectOptionStyle({ minWidth: '30rem' })}
          required={true}
          onChange={
            (e) => {
              console.log(e)
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

  const ReviewStep = () => (
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
        <p>Codes Added to Value Set</p>
        <DataTable
          data={codeItemsToAdd}
          columns={columns.slice(1)}
        />
      </div>
      <div>
        <TextArea
          label='Associated Groupers'
          style={{ minWidth: '20rem' }}
          value={groupersToAdd?.length ? groupersToAdd.map(i => i.label)?.join(', ') : 'No Groupers Selected'}
          readonly={true}
        />
        {
          activeStep === stepContents.length - 1 ? (
            <ButtonRowContainer>
              <Button
                text='Back to Edit'
                onClick={(e) => handleStep('prev', 5)}
              />
              {
                !handleCheckForSubmitErrors('vs-add') ? (
                  <Button
                    text='Create Provisional VS'
                    onClick={(e) => handleSubmitForm()}
                  />
                ) : (<ErrorMessage error='All fields are required. Please complete missing fields in form.'/>)
              }
            </ButtonRowContainer>
          ): null
        }
      </div>
    </div>
  )


  const stepContents = [
    {
      label: 'Create or Update a VSM Provisional Value Set',
      content: <ContentWrapper>{firstStep}</ContentWrapper>
    },
    {
      label: 'Update Value Set Details',
      content: <ContentWrapper>{secondStep}</ContentWrapper>
    },
    {
      label: 'Choose a Code System to Extend as the base for your Provisional Value Set',
      content: <ContentWrapper>{thirdStep}</ContentWrapper>
    },
    {
      label: `Add or Create Provisional Codes for Code System`,
      content: <ContentWrapper>{fourthStep}</ContentWrapper>
    },
    {
      label: 'Add New Value Set to Grouper(s)',
      content: <ContentWrapper>{fifthStep}</ContentWrapper>
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
        <ContentWrapper>
          <ReviewStep/>
        </ContentWrapper>
      ) : (null)}
    </>
  )
}

export default ProvisionalVS