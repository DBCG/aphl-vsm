import { debounce, uniqBy } from 'lodash'
import { NextRouter, useRouter } from 'next/router'
import { useState, useEffect, useMemo, useCallback } from 'react'
import DataTable from 'react-data-table-component'
import { toast } from 'react-toastify'
import Select from 'react-select'
import { buildConditionOptions, Condition } from '@/helpers/conditionHelpers'
import { UpdateValueSetBody } from '@/pages/api/valueset'
import { Button } from '@/components/buttons/Button'
import { IconButton } from '@/components/buttons/IconButton'
import { StyledLabel } from '@/components/InputLabel'
import LoadingIndicator from '@/components/LoadingIndicator'
import { priorityLevelOptions } from '@/components/ProgramValueSetDetails'
import { SelectInputContainer } from '@/components/ProgramValueSetDetails/styles'
import { reactSelectOptionStyle } from './styleOverrides/reactSelect'
import { customTableStyles } from './tables/themes'
import { TextArea } from '@/components/TextArea'
import { ConditionItem } from '@/components/ValueSetSearchTable/types'
import { StyledForm, Row, DropdownContainer, TextAreaSubmitContainer, NoData } from '@/components/ValueSetSearchTable/styles'
import { searchTypes } from '@/components/ValueSetSearchTable'
import LoadingButton from '@mui/lab/LoadingButton'
import { apiFetch } from '@/utils'

interface RowSelectionItem {
  allSelected: boolean
  selectedCount: number
  selectedRows: fhir4.ValueSet[]
}

interface ProvisionalSearchForm {
  allConditions: ConditionItem[]
  document: HTMLElement | null
  formattedGroups: FormattedGroup[]
}

export interface FormattedGroup {
  id: string
  label: string
  url: string
  value: string
  version: string
}

const NoDataContainer = ({ router }: { router: NextRouter }) => {
  return (
    <NoData>
      <p>No Provisional ValueSets Found</p>
      <Button text="Create VSM Provisional Resources" onClick={() => router.push('/programs?resourceType=provisional')} />
    </NoData>
  )
}

const VsmProvisionalSearchForm = ({ allConditions, document, formattedGroups }: ProvisionalSearchForm) => {
  const [currentSearchField, setCurrentSearchField] = useState<typeof searchTypes[number]>(searchTypes[0])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState([])
  const [initialSearchResults, setInitialSearchResults] = useState([])
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([])
  const [selectedGroupers, setSelectedGroupers] = useState<FormattedGroup[]>([])
  const [selectedRows, setSelectedRows] = useState<fhir4.ValueSet[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<typeof priorityLevelOptions[number] | undefined>()
  const router = useRouter()
  const [toggleKey, setToggleKey] = useState(0)

  const clearItems = () => {
    setSearchResults(() => [])
    setSelectedConditions(() => [])
    setSelectedGroupers(() => [])
    setSelectedRows(() => [])
    setSelectedPriority(() => undefined)
    setToggleKey((k) => k + 1)
  }

  const handleSearchProvisionalVS = useCallback(
    debounce(
      async () => {
        setLoading(true)
        clearItems()

        const urlToSearch = `/api/valueset/provisional${searchTerm ? `?${currentSearchField.value}=${searchTerm}` : ''}`
        const results = await apiFetch(urlToSearch)

        if (results.ok) {
          const json = await results.json()
          setSearchResults(json)
          if (!searchTerm && !initialSearchResults.length) {
            setInitialSearchResults(json)
          }
        } else {
          console.error('error occurred')
        }
        setLoading(false)
      },
      800,
      {
        leading: true,
        trailing: false
      }
    ),
    [searchTerm, currentSearchField.value, initialSearchResults]
  )

  useEffect(() => {
    handleSearchProvisionalVS()
  }, [])

  useEffect(() => {
    if (searchTerm?.trim() === '') {
      handleSearchProvisionalVS()
    }
  }, [searchTerm])

  const provisionalVsColumns = useMemo(() => {
    const fields = [
      {
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row.title!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Url',
        selector: (row: fhir4.ValueSet) => row.url!,
        sortable: true,
        wrap: true,
        minWidth: '200px'
      },
      {
        name: 'Contains Provisional Code System(s)',
        selector: (row: fhir4.ValueSet) => {
          const systems = row?.compose?.include?.map((ci) => ci.system || '[system missing]') || []
          return systems.join(',')
        },
        sortable: true,
        wrap: true,
        maxWidth: '40rem',
        cell: (row: fhir4.ValueSet) => {
          const systems = row?.compose?.include?.map((ci) => ci.system) || []
          return (
            <div>
              {systems.map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>
          )
        }
      }
    ]

    return fields
  }, [searchResults])

  const handleSelectedVSets = (r: RowSelectionItem) => {
    setSelectedRows(r.selectedRows)
  }

  const contextActions = useMemo(() => {
    const options = buildConditionOptions(allConditions, selectedConditions)

    const handleAddValueSets = async () => {
      if (loading) return
      setLoading(true)
      const leafPutBody: UpdateValueSetBody['body'] & { selectedTerminologyServer: 'vsm' } = {
        selectedTerminologyServer: 'vsm',
        selectedValueSets: uniqBy(selectedRows, 'id'),
        selectedConditions,
        selectedGroupers,
        selectedPriority: selectedPriority?.value || 'routine'
      }

      const leafsUpdated = await apiFetch('/api/valueset?programId=' + router.query.id, {
        method: 'PUT',
        body: JSON.stringify(leafPutBody)
      })
      if (leafsUpdated.ok) {
        toast.success('Valueset sucessfully added')
        router.push(`/programs/${router.query.id}/valuesets`)
      } else {
        const error = await leafsUpdated.json()
        toast.error('Something went wrong: ' + error)
      }
    }

    return (
      <Row style={{ marginBottom: '1rem', display: selectedRows.length ? 'inherit' : 'none' }}>
        <form style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', gap: '.5rem', flexWrap: 'wrap' }}>
          <SelectInputContainer>
            <Select
              controlShouldRenderValue
              key={`provisional-groups-${toggleKey}`}
              required={true}
              placeholder="Add to Groupers [required]*"
              instanceId={`provisional-groups-${toggleKey}`}
              isMulti={true}
              menuPortalTarget={document}
              styles={reactSelectOptionStyle()}
              options={formattedGroups}
              value={selectedGroupers}
              onChange={(e) => {
                // create new array since e is readonly
                setSelectedGroupers([...e])
              }}
            />
          </SelectInputContainer>
          <SelectInputContainer style={{ maxWidth: '300px', backgroundColor: 'white' }}>
            <Select
              key={`provisional-conditions-${toggleKey}`}
              placeholder="Add to Conditions"
              instanceId={'provisional-conditions'}
              isMulti={true}
              styles={reactSelectOptionStyle()}
              menuPortalTarget={document}
              options={options}
              value={selectedConditions}
              onChange={(e) => {
                // create new array since e is readonly
                setSelectedConditions([...e])
              }}
            />
          </SelectInputContainer>
          <SelectInputContainer style={{ maxWidth: '300px', backgroundColor: 'white', height: 'fit-content' }}>
            <Select
              placeholder="Add priority"
              instanceId="vsm-provisional-priority"
              isMulti={false}
              styles={reactSelectOptionStyle()}
              // @ts-ignore
              options={priorityLevelOptions}
              menuPortalTarget={document}
              value={selectedPriority}
              onChange={(e) => {
                // create new array since e is readonly
                setSelectedPriority(e!)
              }}
            />
          </SelectInputContainer>
          <LoadingButton
            sx={{ alignSelf: 'center', marginBottom: 0 }}
            loading={loading}
            variant="contained"
            onClick={handleAddValueSets}
            disabled={!Boolean(selectedGroupers.length) || loading}
          >
            Add
          </LoadingButton>
        </form>
      </Row>
    )
  }, [
    allConditions,
    selectedConditions,
    selectedRows,
    toggleKey,
    document,
    formattedGroups,
    selectedGroupers,
    selectedPriority,
    loading,
    router
  ])

  return (
    <div>
      <Row>
        {Boolean(initialSearchResults?.length) && (
          <StyledForm>
            <DropdownContainer>
              <StyledLabel id="aria-label" htmlFor="terminology-field-selector">
                Search By ValueSet
              </StyledLabel>
              <SelectInputContainer>
                <Select
                  instanceId="provisional-searchByVS"
                  isMulti={false}
                  menuPortalTarget={document}
                  styles={reactSelectOptionStyle()}
                  options={searchTypes.filter((t) => t.value !== 'oid')}
                  value={currentSearchField}
                  onChange={(e) => {
                    return setCurrentSearchField(e!)
                  }}
                />
              </SelectInputContainer>
            </DropdownContainer>
            <TextAreaSubmitContainer>
              <TextArea
                style={{ width: '100%' }}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="vs-search"
                readonly={false}
                label="Search Text"
                hasIcon={true}
              />
              <IconButton
                style={{ alignSelf: 'center', marginTop: '20px', height: '40px', borderRadius: '0 8px 8px 0' }}
                id={'submit-search-valueset-button'}
                disabled={!searchTerm || searchTerm.trim().length < 0}
                buttoncontext="search"
                type="submit"
                onClick={async (e) => {
                  e?.preventDefault()
                  handleSearchProvisionalVS()
                }}
              />
            </TextAreaSubmitContainer>
          </StyledForm>
        )}
      </Row>
      {contextActions}
      <DataTable
        title="VSM Provisional Value Sets"
        theme="aphl"
        noDataComponent={<NoDataContainer router={router} />}
        selectableRows={true}
        onSelectedRowsChange={handleSelectedVSets}
        customStyles={customTableStyles('readonly')}
        progressPending={loading}
        progressComponent={<LoadingIndicator />}
        // @ts-ignore-next-line
        columns={provisionalVsColumns}
        data={searchResults}
        pagination
        paginationPerPage={10}
      />
    </div>
  )
}

export { VsmProvisionalSearchForm }
