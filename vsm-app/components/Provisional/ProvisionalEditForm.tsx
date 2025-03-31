import styled from 'styled-components'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { TextArea } from '@/components/TextArea'
import { Button } from '@/components/buttons/Button'
import DataTable from 'react-data-table-component'
import { IconButton } from '@mui/material'
import { useRouter } from 'next/router'
import { PageTitle } from '../Typography'
import { LoadingMessage } from '../ProgramValueSetDetails/styles'
import { ErrorMessage } from '../ErrorMessage'
import { toast } from 'react-toastify'
import { isValidCode, IsValidFormatResponse, isValidString } from '@/helpers/fhirDataTypeHelpers'
import { DeleteForever } from '@mui/icons-material'
import ExistingCodesTable from './ExistingCodesTable'

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

export interface CodeTableData {
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
    if (loading) return
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
            disabled={loading}
            onClick={() => handleDelete(row)}
          >
            <DeleteForever color='error' />
          </IconButton>
        )
      },
    ]

    return fields
  }, [codeItemsToAdd, handleDelete, loading, provisionalCS])

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
              <TextArea
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
              <TextArea
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