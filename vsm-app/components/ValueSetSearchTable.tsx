import { SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogTitle, ToggleButton, ToggleButtonGroup } from '@mui/material'
import Select from 'react-select'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.min.css'
import { useGetConditions } from '@/hooks/useGetConditions'
import { Condition, buildConditionOptions } from '@/helpers/conditionHelpers'
import { StyledLabel } from '@/components/InputLabel'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { IconButton } from '@/components/buttons/IconButton'
import { dedupeArray } from '@/helpers/dedupeArray'
import { useGetGroups } from '@/hooks/useGetGroups'
import { SearchResponse, FetchError } from 'pages/api/valueset/search'
import { formatResourceDate } from '@/helpers/formatDates'
import { TextArea } from '@/components/TextArea'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { shallowEqual } from 'utils'
import { SelectedValueSet, SelectedGrouper } from '@/types/grouperTypes'
import { uniqBy } from 'lodash'
import { reactSelectOptionStyle } from './styleOverrides/reactSelect'
import { getVsSteward } from '@/helpers/valueSetHelpers'
import { priorityLevelOptions } from './ProgramValueSetDetails'
import DataTable from 'react-data-table-component'
import { customTableStyles } from './tables/themes'

const searchTypes = [
  { label: 'Title', value: 'title' },
  { label: 'OID', value: 'oid' },
  { label: 'URL (exact match only)', value: 'url' }
] as const

const searchInfoText = {
  oid: 'OID search supports a comma-delimited list, max 100 OIDs. Search here requires an entire OID instead of partial.',
  title: 'Title search finds full or partial matches within VS title',
  url: 'URL search requires a full URL'
}

const NoData = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1em 2em 2em;
`

interface QueryStringItems {
  searchType: string
  count: string
  sortBy: string
  sortDirection: string
  offset: string
  terminologyServer: string
}

const NoDataContainer = ({ router }) => {
  return (
    <NoData>
      <p>No Provisional ValueSets Found</p>
      <Button
        text='Create VSM Provisional Resources'
        onClick={() => router.push('/programs?resourceType=provisional')}
      />
    </NoData>
  )
}
const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  column-gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const StyledForm = styled.form`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  column-gap: 12px;
  row-gap: 15px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

interface SubmitProps {
  hide: boolean
}

export const SubmitSelectedForm = styled.form<SubmitProps>`
  padding: 12px 18px;
  background-color: var(--theme-100);
  max-height: ${(props) => (props.hide ? '0' : '1000px')};
  padding: ${(props) => (props.hide ? '0' : 'auto')};
  transition: all 0.3s;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ErrorText = styled.span`
  color: darkRed;
  font-size: 90%;
  margin-left: 0;
`

const SelectInputContainer = styled.div`
  min-width: 300px;
`

const ErrorBlock = styled.div`
  background-color: white;
  border-left: 2px solid red;
  border-bottom: 2px solid red;
  padding: 4px 6px;
  margin-top: 12px;
  position: relative;
`

const GroupsRequired = styled.i`
  color: var(--accent);
  font-size: 80%;
`

const ErrorBlockText = styled.p`
  margin-top: 0;
  margin-bottom: 8px;
  &:last-of-type {
    margin-bottom: 0;
  }
`

const CopyButton = styled.button`
  background-color: transparent;
  position: absolute;
  top: 4px;
  right: 6px;
  padding: 0px 6px 4px 6px;
`

const TextAreaSubmitContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 38.5rem;
`

const DropdownContainer = styled.div`
  align-self: flex-start;
`

const paginationMaximum = 100

const columnSortMap = {
  1: 'title',
  3: 'lastupdated',
  4: 'version',
  5: 'publisher'
}

const SelectGrouperContainer = styled.div`
  display: ${(props) => (props.hidden ? 'none' : 'block')};
`

const formatGrouperValueSets = (grouperVsets: fhir4.ValueSet[]) => {
  if (!grouperVsets) return []
  return grouperVsets?.map((vSet: fhir4.ValueSet) => ({
    label: vSet?.title,
    url: vSet?.url,
    version: vSet?.version,
    id: vSet?.id,
    value: vSet?.url
  }))
}

const copyText = (txt: string) => navigator.clipboard.writeText(txt)

interface SearchReponseParams {
  searchContext: 'filter' | 'search'
  response: Response | undefined
}

const defaultOffsets = {
  first: '0',
  next: null,
  previous: null,
  last: null
}

type Offset = {
  [key: string]: string | null
}

export interface LeafsToAdd {
  selectedTerminologyServer: 'vsac' | 'ontoserverR4'
  selectedValueSets: SelectedValueSet[]
  selectedConditions: Condition[]
  selectedGroupers: SelectedGrouper[]
  selectedPriority: 'emergent' | 'routine'
}

type HandleAddVSets = (vsets: LeafsToAdd) => void
export type TableContextType = 'add-grouper' | 'search-page'

interface ValueSetSearchTable {
  handleAddValueSets?: HandleAddVSets
  tableContext: TableContextType
  currentSelectedVSId?: string[]
}

const VsmProvisionalSearchForm = ({ allConditions, document, formattedGroups }) => {
  const [currentSearchField, setCurrentSearchField] = useState(searchTypes[0])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  const [selectedGroupers, setSelectedGroupers] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [toggleCleared, setToggleCleared] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState('routine')
  const router = useRouter()

  const handleSearchProvisionalVS = async () => {
    setLoading(true)
    setSearchResults([])

    const urlToSearch = `/api/valueset/provisional${searchTerm ? `?${currentSearchField.value}=${searchTerm}` : ''}`
    const results = await (fetch(urlToSearch))

    if (results.ok) {
      const json = await results.json()
      setSearchResults(json)
    } else {
      console.error('error occurred')
    }
    setLoading(false)
  }

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
      }
    ]

    return fields
  }, [searchResults])

  const handleSelectedVSets = (r) => {
    setSelectedRows(r.selectedRows)
  }

  const handleAddValueSets = async () => {
    const body = {
      selectedTerminologyServer: 'vsm',
      selectedValueSets: uniqBy(selectedRows, 'id'),
      selectedConditions,
      selectedGroupers,
      selectedPriority: selectedPriority.value || 'routine'
    }

    const leafPutBody = JSON.stringify(body)

    const leafsUpdated = await fetch('/api/valueset?programId=' + router.query.id, {
      method: 'PUT',
      body: leafPutBody
    })

    if (leafsUpdated.ok) {
      router.push(`/programs/${router.query.id}/valuesets`)
    }
  }
  const contextActions = useMemo(() => {

    const options = buildConditionOptions(allConditions, selectedConditions)

    return (
      <Row style={{ marginBottom: '1rem', display: selectedRows.length ? 'inherit' : 'none' }}>
        <form style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', gap: '.5rem' }}>
          <SelectInputContainer>
            <Select
              required={true}
              placeholder='Add to Groupers [required]*'
              instanceId='provisional-groups'
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
              placeholder='Add to Conditions'
              instanceId={'provisional-conditions'}
              isMulti={true}
              styles={reactSelectOptionStyle()}
              menuPortalTarget={document}
              options={options}
              value={selectedConditions}
              onChange={(e) => {
                // create new array since e is readonly
                setSelectedConditions(e)
              }}
            />
          </SelectInputContainer>
          <Button
            style={{ alignSelf: 'center', marginBottom: 0 }}
            key="delete"
            type='submit'
            onClick={handleAddValueSets}
            text='Add'
            disabled={!Boolean(selectedGroupers.length)}
          />
        </form>
      </Row>
    )
  }, [selectedRows, allConditions, selectedConditions, selectedGroupers])

  return (
    <div>
      <Row>
        {
          Boolean(searchResults.length) && (
            <StyledForm>
              <DropdownContainer>
                <StyledLabel id="aria-label" htmlFor="terminology-field-selector">
                  Search By ValueSet
                </StyledLabel>
                <SelectInputContainer>
                  <Select
                    instanceId='provisional-searchByVS'
                    isMulti={false}
                    menuPortalTarget={document}
                    styles={reactSelectOptionStyle()}
                    options={searchTypes?.filter(t => t.value !== 'oid')}
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
                  onKeyPress={(e) => {
                    e.preventDefault()
                    setSearchTerm(e.target.value)
                  }}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="vs-search"
                  label="Search Text"
                  hasIcon={true}
                // info={searchInfoText[searchType.value]}
                // helperMessage={searchType.value === 'url' ? '* must search by full URL' : null}
                // errorMessage={errorMessageComponent}
                />
                <IconButton
                  style={{ alignSelf: 'center', height: '56px', borderRadius: '0 8px 8px 0' }}
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

          )
        }
      </Row>
      {contextActions}
      <DataTable
        title='VSM Provisional Value Sets'
        theme="aphl"
        noDataComponent={<NoDataContainer router={router}/>}
        selectableRows={true}
        // contextActions={contextActions}
        onSelectedRowsChange={handleSelectedVSets}
        customStyles={customTableStyles('readonly')}
        progressPending={loading}
        progressComponent={<LoadingIndicator />}
        columns={provisionalVsColumns}
        data={searchResults}
        pagination
        paginationPerPage={10}
      />
    </div>
  )
}

const ValueSetSearchTable = ({ tableContext, handleAddValueSets, currentSelectedVSId }: ValueSetSearchTable) => {
  const router = useRouter()
  const programId = router.query.id as string

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | undefined>([])
  const [filteredVSets, setFilteredVSets] = useState<fhir4.ValueSet[]>([])
  const [selectedValueSets, setSelectedValueSets] = useState<SelectedValueSet[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [addedValueSetsLoading, setAddedValueSetsLoading] = useState<boolean>(false)

  // Paging & search info
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [searchTotal, setSearchTotal] = useState<null | number>(null)
  const offsets = useRef<Offset>(defaultOffsets)
  const [currentPage, setCurrentPage] = useState({ type: 'first', page: 1 })
  const [resultsPerPage, setResultsPerPage] = useState(10)

  const [searchTableContext, setSearchTableContext] = useState<'terminology' | 'vsm-provisional'>('terminology')

  // filters
  const [findInTitle, setFindInTitle] = useState('')
  const [findInSteward, setFindInSteward] = useState('')
  const [findInStatus, setFindInStatus] = useState('')
  const [findInOid, setFindInOid] = useState('')
  const [findInLastUpdated, setFindInLastUpdated] = useState('')
  const [findInVersion, setFindInVersion] = useState('')
  const [sortParams, setSortParams] = useState({ column: 'title', direction: 'asc' })

  // set default terminology server for search
  const [selectedTerminologyServer, setSelectedTerminologyServer] = useState(terminologyServerEndpoints[0])
  const [searchType, setSearchType] = useState<typeof searchTypes[number]>(searchTypes[0])

  // set conditions and groupers to be applied to valuesets
  const [selectedGroupers, setSelectedGroupers] = useState<SelectedGrouper[]>([])
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([])
  const [selectedPriority, setSelectedPriority] = useState(priorityLevelOptions[1])
  const [toggledClearRows, setToggledClearRows] = useState(false)
  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)
  // error info
  // const [addValueSetError, setAddValueSetError] = useState<Error | null>(null)
  const [fetchError, setFetchError] = useState<FetchError | null>(null)

  const allConditions = useGetConditions()
  const { groups } = useGetGroups({ programId })

  useEffect(() => { setMyDocument(document?.body) }, [])

  const formattedGroups = useMemo(() => {
    if (!groups) return []
    return formatGrouperValueSets(groups)
  }, [groups])

  const clearPage = () => {
    setCurrentPage({ type: 'first', page: 1 })
    setSearchTotal(null)
    setResultsPerPage(10)
  }

  const handleSetResultsPerPage = async (newResults: number, newPage: number) => {
    setResultsPerPage(newResults)
    await submitVSetSearch({ searchContext: 'search', pageNumber: newPage, newResultsPerPage: newResults })
  }
  // take the response from the server and parse the important data

  const filterExists = useMemo(
    () =>
      findInTitle?.length ||
      findInStatus?.length ||
      findInSteward?.length ||
      findInVersion?.length ||
      findInOid?.length ||
      findInLastUpdated?.length,
    [findInLastUpdated?.length, findInTitle?.length, findInOid?.length, findInStatus?.length, findInVersion?.length, findInSteward?.length]
  )
  const vsNumExceedsFilterLimit = !!searchTotal && searchTotal > paginationMaximum

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by title/OID/steward
   */
  const submitVSetSearch = async ({
    searchContext = 'search',
    pageNumber,
    newResultsPerPage,
  }: {
    searchContext?: 'filter' | 'search'
    pageNumber?: number
    newResultsPerPage?: number
  }) => {
    setToggledClearRows(true)

    let response
    if (!searchTerm.trim()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    let searchStr = ''

    if (searchType.value === 'oid') {
      const trimmedWords = searchTerm
        ?.trim()
        ?.split(',')
        ?.map((term) => term?.trim())
      const dedupedOids = dedupeArray(trimmedWords)
      // if more than 100 OIDs, exit with error
      if (dedupedOids?.length > paginationMaximum) {
        const message = `OID search maximum is ${paginationMaximum} at a time.`
        setIsLoading(false)
        toast.error(message)
        return
      }
      searchStr = dedupedOids?.join(',')
    } else if (searchType.value === 'title') {
      searchStr = searchTerm.trim()
    } else if (searchType.value === 'url') {
      searchStr = searchTerm.trim()
    }

    // Since the state maybe updated asynchronously, we should rely on the explicit pageNumber and newResultsPerPage being passed in
    const offset = ((pageNumber || currentPage?.page) - 1) * (newResultsPerPage || resultsPerPage)

    let queryStringItems = {
      searchType: searchType?.value,
      count: (newResultsPerPage || resultsPerPage),
      sortBy: sortParams?.column,
      sortDirection: sortParams?.direction,
      offset: offset,
      terminologyServer: selectedTerminologyServer?.value?.title
    }

    let queryString = ''

    Object.keys(queryStringItems).forEach((key) => (queryString += `&${key}=${queryStringItems[key as keyof QueryStringItems]}`))

    const endpoint = `/api/valueset/search?search=${searchStr}${queryString}`

    response = await fetch(endpoint)
    await handleSearchResponse({ searchContext, response })
    setToggledClearRows(false)
    setSelectedValueSets([])
    setIsLoading(false)
  }

  const handleSearchResponse = async ({ searchContext, response }: SearchReponseParams) => {
    if (response?.ok) {
      const valueSetResponse = (await response.json()) as SearchResponse
      const newOffsets = {
        first: valueSetResponse?.first || null,
        next: valueSetResponse?.next || null,
        previous: valueSetResponse?.previous || null,
        last: valueSetResponse?.last || null
      }
      if (!shallowEqual(offsets.current, newOffsets)) {
        offsets.current = newOffsets
      }

      if (searchContext === 'filter') {
        setFilteredVSets(valueSetResponse.valueSets)
        setFetchError(valueSetResponse.error || null)
        // what to do with total when filtered? probably fine
      } else {
        setValueSets(valueSetResponse.valueSets?.filter((i) => !currentSelectedVSId?.includes(i?.id as string)))
        setSearchTotal(valueSetResponse.total)
        setFetchError(valueSetResponse.error || null)
      }
    } else if (response && !response?.ok) {
      const valueSetResponse = await response.json()
      setValueSets([])
      setFetchError(valueSetResponse)
    } else {
      setValueSets([])
      setFetchError({
        errorType: 'fetch-error',
        message: 'No response for search'
      })
    }
  }

  // handle filters
  useEffect(() => {
    if (!filterExists) {
      setFilteredVSets([])
      return
    }
    // if there are no valuesets, don't filter
    if (!valueSets || !valueSets.length) return

    // if the number of valuesets are more than the max allowed,
    // send out a request to the server to filter
    if (valueSets.length > paginationMaximum) {
      submitVSetSearch({ searchContext: 'filter' })
      // if there are less than paginationMaximum, filter in FE synchronously
      // this is not ideal, but VSAC does not allow us to combine multiple search params
    } else {
      let filteredValueSets: fhir4.ValueSet[] = valueSets
      if (findInOid.length) {
        filteredValueSets = filteredValueSets?.filter((vs) => {
          const oid = vs?.id?.split('|')?.[0]
          return oid?.includes(findInOid)
        })
      }
      if (findInTitle?.length) {
        filteredValueSets = filteredValueSets?.filter((vs) => vs?.title?.toLowerCase()?.includes(findInTitle?.toLocaleLowerCase()))
      }
      if (findInStatus?.length) {
        filteredValueSets = filteredValueSets?.filter((vs) => {
          return vs?.status?.toLowerCase()?.includes(findInStatus.toLowerCase())
        })
      }
      if (findInSteward?.length) {
        filteredValueSets = filteredValueSets?.filter((vs) => getVsSteward(vs).toLocaleLowerCase()?.includes(findInSteward?.toLocaleLowerCase()))
      }
      if (findInLastUpdated?.length) {
        filteredValueSets = filteredValueSets?.filter((vs: fhir4.ValueSet) => {
          const lastUpdateDate = formatResourceDate({ resource: vs, dateType: 'lastUpdated' })
          return lastUpdateDate?.includes(findInLastUpdated)
        })
      }
      if (findInVersion?.length) {
        filteredValueSets = filteredValueSets?.filter((vs) => {
          return vs?.version?.toLowerCase()?.includes(findInVersion.toLowerCase())
        })
      }
      filteredValueSets = filteredValueSets.filter((i) => !currentSelectedVSId?.includes(i?.id as string))
      setFilteredVSets(filteredValueSets)
    }
  }, [valueSets, findInTitle, findInStatus, findInVersion, findInSteward, findInOid, findInLastUpdated, filterExists])

  // unused for now because VSAC FHIR does not seem support _filter params...
  const handleSort = (column: any, sortDirection: 'asc' | 'desc') => {
    // @ts-expect-error
    const columnToSort = columnSortMap[column.id]
    setSortParams({
      column: columnToSort,
      direction: sortDirection
    })
  }

  const handlePageChange = async (newPage: number) => {
    // don't call if same page
    if (newPage == currentPage.page) return
    let type = 'first'

    if (newPage == currentPage.page - 1) {
      type = 'previous'
    } else if (newPage == currentPage.page + 1) {
      type = 'next'
    } else if (newPage < currentPage.page) {
      type = 'first'
    } else if (newPage > currentPage.page) {
      type = 'last'
    }

    const pageChangeState = {
      page: newPage,
      type
    }
    setCurrentPage(pageChangeState)
    await submitVSetSearch({ searchContext: 'search', pageNumber: newPage })
  }

  const submitAddVSet = async (e: SyntheticEvent) => {
    e.preventDefault()

    if (tableContext === 'search-page' && !selectedGroupers.length) {
      const message = 'Select at least one valueset with an associated group. (Conditions optional)'
      toast.error(message)
      setAddedValueSetsLoading(false)
      return
    } else if (!selectedValueSets.length) {
      return
    }

    const leafsToAdd = {
      selectedTerminologyServer: selectedTerminologyServer.value.title,
      selectedValueSets: uniqBy(selectedValueSets, 'id'),
      selectedConditions,
      selectedPriority: selectedPriority.value || 'routine',
      selectedGroupers
    } as LeafsToAdd

    // add grouper context needs to pass the info to the parent to submit
    if (tableContext === 'add-grouper') {
      if (handleAddValueSets) {
        handleAddValueSets(leafsToAdd)
        const selectedVSIds = selectedValueSets.map((i) => i.id)
        setValueSets(valueSets?.filter((i) => !selectedVSIds?.includes(i?.id)))
      }
      setToggledClearRows(true)

      // the search page submits from here
    } else if (tableContext === 'search-page') {
      setAddedValueSetsLoading(true)
      const leafPutBody = JSON.stringify(leafsToAdd)

      // needs some error handling down here
      const leafsUpdated = await fetch('/api/valueset?programId=' + router.query.id, {
        method: 'PUT',
        body: leafPutBody
      })

      if (leafsUpdated.ok) {
        toast.success('ValueSet Add Successful')
        router.push(`/programs/${programId}/valuesets`)
      } else {
        const { error } = await leafsUpdated.json()
        toast.error(error)
      }
      setAddedValueSetsLoading(false)
    }
    setSelectedValueSets([])
    setSearchTerm('')
    setSelectedConditions([])
    setSelectedPriority(priorityLevelOptions[1])
    setSelectedGroupers([])
  }

  useEffect(() => {
    if (fetchError?.message && fetchError?.errorType !== 'failed-oids') {
      toast.error(fetchError.message)
    }
  }, [fetchError?.message, fetchError?.errorType])
  // search page requires the target grouper to be selected, 'add-grouper' context does not
  const buttonDisabled = tableContext === 'search-page' ? !selectedValueSets.length || !selectedGroupers.length : !selectedValueSets.length

  let errorMessageComponent = null
  if (vsNumExceedsFilterLimit) {
    errorMessageComponent = (
      <ErrorText>
        {searchTotal} results
        <br />
        Refine search to enable filters (max {paginationMaximum} results)
      </ErrorText>
    )
  } else if (searchTerm.length < 3 && searchTerm.length > 0) {
    errorMessageComponent = (
      <ErrorText>
        Minimum 3 characters required
      </ErrorText>
    )
  }

  const showProvisionalSearch = useMemo(() => {
    return Boolean(tableContext === 'search-page' && searchTableContext === 'vsm-provisional')
  }, [tableContext, searchTableContext])

  const handleSearchToggleChange = (e) => {
    setSearchTableContext(e)
  }

  return (
    <Col>
      <Dialog open={addedValueSetsLoading}>
        <DialogTitle>Saving Valuesets to Program...</DialogTitle>
        <div style={{ margin: '0 auto' }}>
          <LoadingIndicator size="medium" />
        </div>
      </Dialog>
      <Row style={{ justifyContent: 'flex-start' }}>
        {tableContext === 'search-page' && (
          <ToggleButtonGroup
            color="primary"
            value={searchTableContext}
            exclusive
            onChange={(e) => {
              handleSearchToggleChange(e.target.value)
            }}
            aria-label="Platform"
          >
            <ToggleButton value="terminology">Search in Terminology Servers</ToggleButton>
            <ToggleButton value="vsm-provisional">Search in VSM Provisional</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Row>
      {searchTableContext === 'vsm-provisional' ? (
        <VsmProvisionalSearchForm allConditions={allConditions} document={myDocument} formattedGroups={formattedGroups} />
      ) : (
        <div>
          <TitleRow>
            <Row>
              <StyledForm>
                <DropdownContainer>
                  <StyledLabel id="aria-label" htmlFor="terminology-server-selector">
                    Terminology Source
                  </StyledLabel>
                  <SelectInputContainer>
                    <Select
                      instanceId={`${tableContext}-termServer`}
                      isMulti={false}
                      styles={reactSelectOptionStyle()}
                      options={terminologyServerEndpoints}
                      value={selectedTerminologyServer}
                      onChange={(e) => {
                        return setSelectedTerminologyServer(e!)
                      }}
                    />
                  </SelectInputContainer>
                </DropdownContainer>
                <DropdownContainer>
                  <StyledLabel id="aria-label" htmlFor="terminology-server-selector">
                    Search By ValueSet
                  </StyledLabel>
                  <SelectInputContainer>
                    <Select
                      instanceId={`${tableContext}-searchByVS`}
                      isMulti={false}
                      styles={reactSelectOptionStyle()}
                      options={searchTypes}
                      value={searchType}
                      onChange={(e) => {
                        return setSearchType(e!)
                      }}
                    />
                  </SelectInputContainer>
                </DropdownContainer>
                <TextAreaSubmitContainer>
                  <TextArea
                    style={{ width: '100%' }}
                    onKeyPress={(e) => {
                      e.preventDefault()
                      submitVSetSearch({ searchContext: 'search' })
                    }}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="vs-search"
                    label="Search Text"
                    hasIcon={true}
                    info={searchInfoText[searchType.value]}
                    helperMessage={searchType.value === 'url' ? '* must search by full URL' : null}
                    errorMessage={errorMessageComponent}
                  />
                  <IconButton
                    style={{ alignSelf: 'center', height: '56px', borderRadius: '0 8px 8px 0' }}
                    id={'submit-search-valueset-button'}
                    disabled={searchTerm.length < 3 || searchTerm.length === 0}
                    buttoncontext="search"
                    type="submit"
                    onClick={(e) => {
                      e?.preventDefault()
                      clearPage()
                      submitVSetSearch({ searchContext: 'search' })
                    }}
                  />
                </TextAreaSubmitContainer>
                {fetchError?.errorType === 'failed-oids' ? (
                  <ErrorBlock>
                    <ErrorBlockText>Search for these OIDs failed:</ErrorBlockText>
                    <ErrorBlockText>{fetchError?.data}</ErrorBlockText>
                    <ErrorBlockText>They may be malformed or nonexistent.</ErrorBlockText>
                    <CopyButton
                      onClick={(e) => {
                        e.preventDefault()
                        toast.success('Copied failed OIDs to clipboard!')
                        copyText(fetchError?.data || '')
                      }}
                      title="Copy Failed OIDs"
                    >
                      <Image src="/images/clipboard-outline.svg" alt="Copy" width={16} height={16} />
                    </CopyButton>
                  </ErrorBlock>
                ) : null}
              </StyledForm>
            </Row>
          </TitleRow>
          <SubmitSelectedForm hide={!selectedValueSets?.length}>
            <Row>
              <div>
                <StyledLabel id="aria-label" htmlFor="conditions-selector">
                  Conditions
                </StyledLabel>
                <SelectInputContainer>
                  <Select
                    instanceId={`${tableContext}-conditions`}
                    isMulti={true}
                    styles={reactSelectOptionStyle()}
                    options={buildConditionOptions(allConditions, selectedConditions)}
                    value={selectedConditions}
                    onChange={(e) => {
                      // create new array since e is readonly
                      setSelectedConditions([...e])
                    }}
                  />
                </SelectInputContainer>
              </div>
              <SelectGrouperContainer hidden={tableContext !== 'add-grouper'}>
                <StyledLabel id="aria-label" htmlFor="priority-selector">
                  Priority
                </StyledLabel>
                <SelectInputContainer>
                  <Select
                    isClearable={false}
                    instanceId={`${tableContext}-priority`}
                    isMulti={false}
                    styles={reactSelectOptionStyle()}
                    // @ts-ignore
                    options={priorityLevelOptions}
                    value={selectedPriority}
                    onChange={(e) => {
                      // create new array since e is readonly
                      setSelectedPriority(e!)
                    }}
                  />
                </SelectInputContainer>
              </SelectGrouperContainer>
              <SelectGrouperContainer hidden={tableContext === 'add-grouper'}>
                <StyledLabel id="aria-label" htmlFor="conditions-selector">
                  Groups <GroupsRequired>(*required)</GroupsRequired>
                </StyledLabel>
                <SelectInputContainer>
                  <Select
                    instanceId={`${tableContext}-groups`}
                    isMulti={true}
                    styles={reactSelectOptionStyle()}
                    options={formattedGroups}
                    value={selectedGroupers}
                    onChange={(e) => {
                      // create new array since e is readonly
                      setSelectedGroupers([...e])
                    }}
                  />
                </SelectInputContainer>
              </SelectGrouperContainer>
              <Button
                text="Add Selected To Program"
                id={'add-valueset-to-program'}
                disabled={buttonDisabled}
                style={{ maxHeight: '60px', alignSelf: 'end', justifySelf: 'flex-end' }}
                onClick={(e) => submitAddVSet(e)}
              />
            </Row>
          </SubmitSelectedForm>
          <SearchTable
            tableContext={tableContext}
            searchType={searchType.value}
            valueSets={!filterExists || vsNumExceedsFilterLimit ? valueSets || [] : filteredVSets}
            setSelectedValueSets={setSelectedValueSets}
            clearSelectedRows={toggledClearRows}
            setClearSelectedRows={setToggledClearRows}
            findInTitle={findInTitle}
            setFindInTitle={setFindInTitle}
            findInSteward={findInSteward}
            setFindInSteward={setFindInSteward}
            findInStatus={findInStatus}
            setFindInStatus={setFindInStatus}
            findInVersion={findInVersion}
            setFindInVersion={setFindInVersion}
            findInOid={findInOid}
            setFindInOid={setFindInOid}
            findInLastUpdated={findInLastUpdated}
            setFindInLastUpdated={setFindInLastUpdated}
            showFilters={!vsNumExceedsFilterLimit}
            // handle this loader to make sure status doesn't move table
            isLoading={isLoading}
            resultsPerPage={resultsPerPage}
            paginationTotalRows={searchTotal || 0}
            handlePageChange={handlePageChange}
            handlePerRowsChange={handleSetResultsPerPage}
          />
        </div>
      )}
    </Col>
  )
}

export { ValueSetSearchTable }
