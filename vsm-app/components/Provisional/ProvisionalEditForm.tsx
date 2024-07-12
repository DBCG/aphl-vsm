import styled from 'styled-components'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { VSMSession, allowEditing, can } from '@/helpers/rolesHelper'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { TextArea } from '@/components/TextArea'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import DataTable from 'react-data-table-component'
import { IconButton } from '@mui/material'
import { DeleteForeverSharp } from '@mui/icons-material'
import { useRouter } from 'next/router'
import { PageTitle } from '../Typography'
import { LoadingMessage } from '../ProgramValueSetDetails/styles'
import { debounce } from 'lodash'

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

interface ProvisionalEditForm {
  itemType: 'vs' | 'cs'
  readOnly: boolean
  existingResource?: fhir4.CodeSystem | fhir4.ValueSet
}

interface CodeTableData {
  code: string
  display: string
  definition: string
}

interface ExistingCodesTableData {
  codeSystem: fhir4.CodeSystem
}

const allFieldsExist = (codeItems: string[]) => {
  const filtered = codeItems.filter(i => i.trim() !== '')
  // check if vals are even valid
  const allFieldsPopulated = filtered.length === 3
  return allFieldsPopulated
}

const ExistingCodesTable = ({ codeSystem }: { codeSystem?: fhir4.CodeSystem }) => {
  const columns = useMemo(() => {
    if (!codeSystem) return []
    const fields = [
      {
        name: 'Code',
        selector: (row: fhir4.CodeSystemConcept) => row.code
      },
      {
        name: 'Display',
        selector: (row: fhir4.CodeSystemConcept) => row.display || ''
      },
      {
        name: 'Definition',
        selector: (row: fhir4.CodeSystemConcept) => row.definition || '',
        minWidth: '20rem',
        cell: (row: fhir4.CodeSystemConcept) => <p>{row.definition}</p>
      }
    ]
    return fields
  }, [codeSystem])

  return <DataTable pagination data={codeSystem?.concept || []} columns={columns} />
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
  const allVsacCS = useGetCS(myDocument)
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')
  const [codeItemsToAdd, setCodeItemsToAdd] = useState<fhir4.CodeSystemConcept[]>([])
  const [formSubmitting, setFormSubmitting] = useState(false)
  const { data: session } = useSession() as unknown as { data: VSMSession }

  const { provisionalCS, isCsLoading } = useGetProvisionalCS({ systemUrl: selectedCodeSystemBase?.value })

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
    if (!selectedCodeSystemBase && router.query.csSelected) {
      const option = selectOptions?.find((o) => o.value === router.query.csSelected)
      setSelectedCodeSystemBase(option)
    }
  }, [router, selectOptions])

  const enableAdd = useMemo(() => {
    const shouldEnable = allFieldsExist([codeToAdd, displayToAdd, definitionToAdd])
    return shouldEnable
  }, [codeToAdd, displayToAdd, definitionToAdd])

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
            <DeleteForeverSharp color='error' />
          </IconButton>
        )
      },
    ]

    return fields
  }, [codeItemsToAdd, handleDelete])

  const handleAddToList = () => {
    setCodeItemsToAdd(prev => [
      ...prev,
      { code: codeToAdd, display: displayToAdd, definition: definitionToAdd }
    ])
    clearCurrentCodeItems()
  }

  const handleUpdateCS = debounce(async () => {
    setFormSubmitting(true)
    if (!selectedCodeSystemBase) throw new Error('No CodeSystemBase selected!')
    const codesBySystemToUpdate = { [selectedCodeSystemBase.value]: codeItemsToAdd }

    const submitBody = { codesBySystemToUpdate }

    const result = await fetch('/api/codesystem/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })

    if (result.ok) {
      router.push('/programs?resourceType=provisional')
    } else {
      setFormSubmitting(false)
    }
  }, 2000, { leading: true, trailing: false })

  if (!provisionalCS && !canEdit) {
    return <p>Editing Code Systems not permitted here.</p>
  } else {
    return (
      <div>
        <PageTitle>{`${can(session, 'edit') ? 'Create or Edit' : 'View'} VSM Provisional Code System`}</PageTitle>
        <p>Select a Code System URL</p>
        <QuestionnaireRowContainer style={{ marginBottom: '2rem' }}>
          <Select
            isClearable={false}
            isDisabled={!canEdit}
            isLoading={isCsLoading}
            loadingMessage={() => <LoadingMessage>Loading...</LoadingMessage>}
            options={selectOptions}
            isMulti={false}
            value={selectedCodeSystemBase}
            menuPortalTarget={myDocument}
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
            <ExistingCodesTable codeSystem={provisionalCS.find(c => c?.url === selectedCodeSystemBase?.value)} />
            { can(session, 'edit') && (
              <p style={{ marginBottom: '1rem' }}>You may add more provisional codes to your code system below:</p>
            )}
          </div>
        ) : (
          <NoProvVsWrapper style={{ flexDirection: 'column', flexWrap: 'nowrap', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ marginBottom: 0 }}>{`No existing VSM Provisional Code Systems found for ${selectedCodeSystemBase?.label}.`}</p>
            { can(session, 'edit') && <p>{`Create one by adding code items below.`}</p> }
          </NoProvVsWrapper>
        )}
        { can(session, 'edit') && (
          <>
          <QuestionnaireRowContainer>
            <SearchInput
              label='Code'
              onChange={(e) => {
                // handle empty string case
                setCodeToAdd(e.target.value)
              }}
              value={codeToAdd}
              style={{ minWidth: '20rem', flex: 1 }}
              required={true}
            />
            <SearchInput
              label='Display'
              onChange={(e) => setDisplayToAdd(e.target.value)}
              value={displayToAdd}
              style={{ minWidth: '20rem', flex: 1 }}
              required={true}
            />
            <TextArea
              label='Definition (more detail about this code)'
              onChange={(e) => setDefinitionToAdd(e.target.value)}
              value={definitionToAdd}
              style={{ minWidth: '20rem', flex: 1 }}
              required={true}
            />
          </QuestionnaireRowContainer>
          <ButtonRowContainer>
            <Button
              text='Add to List'
              onClick={handleAddToList}
              disabled={!enableAdd || isCsLoading}
            />
          </ButtonRowContainer>
          <p>{`Code List to add: `}</p>
          <DataTable
            // @ts-ignore
            data={codeItemsToAdd}
            columns={codeColumns}
            noDataComponent={noDataComponent('setProvisionals')}
          />
          <ButtonRowContainer>
            <Button
              text='ADD TO SYSTEM'
              disabled={!Boolean(codeItemsToAdd?.length) || isCsLoading}
              onClick={(e) => handleUpdateCS()}
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