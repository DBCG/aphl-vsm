import styled from 'styled-components'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { reactSelectOptionStyle } from '@/components/styleOverrides/reactSelect'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { fetcher } from '@/utils'
import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import { useGetCS } from '@/hooks/useGetCodeSystems'
import { TextArea } from '@/components/TextArea'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import DataTable from 'react-data-table-component'
import { IconButton } from '@mui/material'
import { DeleteForeverSharp } from '@mui/icons-material'
import router from 'next/router'

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
        <p>No Provisional Codes have ben added to this Value Set</p>
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

const allFieldsExist = (codeItems: string[]) => {
  const filtered = codeItems.filter(i => i.trim() !== '')
  // check if vals are even valid
  const allFieldsPopulated = filtered.length === 3
  return allFieldsPopulated
}

const ExistingCodesTable = ({ codeSystem }: ExistingCodesTbl) => {

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
    // @ts-ignore
    <DataTable pagination data={codeSystem?.concept || []} columns={columns} />
  )
}

const ProvisionalCSForm = ({ existingCs: test, readOnly, canEdit }) => {
  const [selectedCodeSystemBase, setSelectedCodeSystemBase] = useState(undefined)
  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)
  const [provisionalCodeSystems, setProvisionalCodeSystems] = useState([])
  const allVsacCS = useGetCS(myDocument)
  const [existingCS, setExistingCS] = useState(null)
  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')
  const [codeItemsToAdd, setCodeItemsToAdd] = useState([] as fhir4.CodeSystemConcept[])
  const [formSubmitting, setFormSubmitting] = useState(false)

  const existingProvisionalCs = useGetProvisionalCS({ systemUrl: selectedCodeSystemBase?.value })

  const handleDelete = (item: CodeTableData) => {
    const filteredItems = codeItemsToAdd?.filter(i => !(i?.code === item.code))
    setCodeItemsToAdd(filteredItems)
  }

  const clearCurrentCodeItems = () => {
    setCodeToAdd('')
    setDefinitionToAdd('')
    setDisplayToAdd('')
  }

  useEffect(() => {
    clearCurrentCodeItems()
  }, [selectedCodeSystemBase])

  useEffect(() => {
    console.log('selected cs base: ', selectedCodeSystemBase)
    console.log('existing provisional cs: ,', existingProvisionalCs)
  }, [existingProvisionalCs])

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  const selectOptions = useMemo(() => {
    console.log('allvsaccs: ', allVsacCS)
    const mapped = allVsacCS?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
    const defaultOption = mapped?.[0]
    console.log('defaultOption: , ', defaultOption)
    setSelectedCodeSystemBase(defaultOption)
    return mapped
  }, [allVsacCS])

  const enableAdd = useMemo(() => {
    const shouldEnable = allFieldsExist([codeToAdd, displayToAdd, definitionToAdd])
    return shouldEnable
  }, [codeToAdd, displayToAdd, definitionToAdd])

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

  const handleAddToList = () => {
    setCodeItemsToAdd(prev => [
      ...prev,
      { code: codeToAdd, display: displayToAdd, definition: definitionToAdd }
    ])
    clearCurrentCodeItems()
  }

  const handleUpdateCS = async () => {
    setFormSubmitting(true)
    const codesBySystemToUpdate = { [selectedCodeSystemBase?.value as string]: codeItemsToAdd }

    const submitBody = { codesBySystemToUpdate }

    const result = await fetch('/api/codesystem/provisional', {
      method: 'POST',
      body: JSON.stringify(submitBody)
    })

    if (result.ok) {
      const json = await result.json()
      // need a page to push to
      router.push(`/programs`)
    } else {
      // set error here
    }
  }

  if (!existingCS && !canEdit) {
    return <p>Editing Code Systems not permitted here.</p>
  } else {
    return (
      <div>
        <p>Select a Code System URL to create new or edit existing VSM Provisional Code System</p>
        <QuestionnaireRowContainer style={{ marginBottom: '2rem' }}>
          <Select
            isClearable={false}
            isDisabled={!canEdit}
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
        {existingProvisionalCs?.length ? (
          <div>
            <p>A provisional code system exists in VSM for {selectedCodeSystemBase?.label} containing the following codes:</p>
            <ExistingCodesTable codeSystem={existingProvisionalCs?.find(c => c?.url === selectedCodeSystemBase?.value)} />
            <p style={{ marginBottom: '1rem' }}>You may add more provisional codes to your code system below:</p>
          </div>
        ) : (
          <NoProvVsWrapper style={{ flexDirection: 'column', flexWrap: 'nowrap', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ marginBottom: 0 }}>{`No existing VSM Provisional Code Systems found for ${selectedCodeSystemBase?.label}.`}</p>
            <p>{`Create one by adding code items below.`}</p>
          </NoProvVsWrapper>
        )}
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
            disabled={!enableAdd}
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
            disabled={!Boolean(codeItemsToAdd?.length)}
            onClick={(e) => handleUpdateCS()}
          />
        </ButtonRowContainer>
      </div>
    )
  }
}




export const ProvisionalEditForm = ({ itemType, readOnly, existingResource, canEdit }) => {
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const { data: systemAndVersionData = [] } = useSWR(null, fetcher, { revalidateOnFocus: true })
  console.log('systemversiondata: ', systemAndVersionData)
  // if (itemType === 'cs') {
  return (
    <ProvisionalCSForm
      existingCS={existingResource}
      readOnly={readOnly}
      canEdit={canEdit || true}
    />
  )
  // }
}