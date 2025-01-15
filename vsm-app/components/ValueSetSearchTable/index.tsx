import { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogTitle, ToggleButton, ToggleButtonGroup } from '@mui/material'
import Select from 'react-select'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { useGetConditions } from '@/hooks/useGetConditions'
import { Condition, buildConditionOptions } from '@/helpers/conditionHelpers'
import { StyledLabel } from '@/components/InputLabel'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { IconButton } from '@/components/buttons/IconButton'
import { priorityLevelOptions } from '@/components//ProgramValueSetDetails'
import { VsmProvisionalSearchForm } from '@/components/VsmProvisionalSearchForm'
import { TextArea } from '@/components/TextArea'
import { useGetGroups } from '@/hooks/useGetGroups'
import { SearchResponse, FetchError } from 'pages/api/valueset/search'
import { formatResourceDate } from '@/helpers/formatDates'
import { shallowEqual } from 'utils'
import { SelectedValueSet, SelectedGrouper } from '@/types/grouperTypes'
import { debounce, uniqBy } from 'lodash'
import { reactSelectOptionStyle } from '../styleOverrides/reactSelect'
import { useGetEndpointOptionsForUI } from '@/hooks/useGetEndpointOptionsForUI'
import {
  ErrorText,
  Col,
  SelectInputContainer,
  ErrorBlock,
  ErrorBlockText,
  GroupsRequired,
  CopyButton,
  DropdownContainer,
  Row,
  SelectGrouperContainer,
  StyledForm,
  SubmitSelectedForm,
  TextAreaSubmitContainer,
  TitleRow
} from './styles'
import { LeafsToAdd, Offset, QueryStringItems, SearchReponseParams, TableContextOptions, ValueSetSearchTableProps } from './types'
import { DescriptionText } from '@/pages/programs/[id]/valuesets/search'

export const searchTypes = [
  { label: 'Title', value: 'title' },
  { label: 'OID', value: 'oid' },
  { label: 'URL (exact match only)', value: 'url' }
] as const

const searchInfoText = {
  oid: 'OID search supports a comma-delimited list, max 100 OIDs. Search here requires an entire OID instead of partial.',
  title: 'Title search finds full or partial matches within VS title',
  url: 'URL search requires a full URL'
}

const PAGINATION_MAXIMUM = 100

const formatGrouperValueSets = (grouperVsets: fhir4.ValueSet[]) => {
  if (!grouperVsets) return []
  return grouperVsets?.map((vSet: fhir4.ValueSet) => ({
    label: vSet.title || 'No Title',
    url: vSet.url || 'No URL',
    version: vSet.version || 'No Version',
    id: vSet.id || 'No ID',
    value: vSet?.url || ''
  }))
}

const defaultOffsets = {
  first: '0',
  next: null,
  previous: null,
  last: null
}

const ValueSetSearchTable = ({ tableContext, handleAddValueSets, currentSelectedVSId }: ValueSetSearchTableProps) => {
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

  const [searchTableContext, setSearchTableContext] = useState<TableContextOptions>('terminology')

  // filters
  const [findInTitle, setFindInTitle] = useState('')
  const [findInStatus, setFindInStatus] = useState('')
  const [findInOid, setFindInOid] = useState('')
  const [findInLastUpdated, setFindInLastUpdated] = useState('')
  const [findInVersion, setFindInVersion] = useState('')
  const [sortParams, setSortParams] = useState({ column: 'title', direction: 'asc' })

  // set default terminology server for search
  const { terminologySources } = useGetEndpointOptionsForUI()
  const [selectedTerminologyServer, setSelectedTerminologyServer] = useState(terminologySources?.[0])
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

  useEffect(() => {
    setMyDocument(document?.body)
  }, [])

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
    () => findInTitle?.length || findInStatus?.length || findInVersion?.length || findInOid?.length || findInLastUpdated?.length,
    [findInLastUpdated?.length, findInTitle?.length, findInOid?.length, findInStatus?.length, findInVersion?.length]
  )
  const vsNumExceedsFilterLimit = !!searchTotal && searchTotal > PAGINATION_MAXIMUM

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by title/OID/steward
   */
  const submitVSetSearch = useCallback(
    debounce(
      async ({
        searchContext = 'search',
        pageNumber,
        newResultsPerPage
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
          const dedupedOids = Array.from(new Set(trimmedWords)) // dedupe the OIDs
          // if more than 100 OIDs, exit with error
          if (dedupedOids?.length > PAGINATION_MAXIMUM) {
            const message = `OID search maximum is ${PAGINATION_MAXIMUM} at a time.`
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
          count: newResultsPerPage || resultsPerPage,
          sortBy: sortParams?.column,
          sortDirection: sortParams?.direction,
          offset: offset,
          terminologyServer: selectedTerminologyServer?.value?.id
        }

        let queryString = ''

        Object.keys(queryStringItems).forEach((key) => (queryString += `&${key}=${queryStringItems[key as keyof QueryStringItems]}`))

        const endpoint = `/api/valueset/search?search=${searchStr}${queryString}`

        response = await fetch(endpoint)
        await handleSearchResponse({ searchContext, response })
        setToggledClearRows(false)
        setSelectedValueSets([])
        setIsLoading(false)
      },
      800,
      { leading: true, trailing: false }
    ),
    [searchTerm, searchType, selectedTerminologyServer, currentPage?.page, resultsPerPage, sortParams]
  )

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
      setFetchError(valueSetResponse.error)
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
    if (valueSets.length > PAGINATION_MAXIMUM) {
      submitVSetSearch({ searchContext: 'filter' })
      // if there are less than PAGINATION_MAXIMUM, filter in FE synchronously
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
  }, [valueSets, findInTitle, findInStatus, findInVersion, findInOid, findInLastUpdated, filterExists])

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
      selectedTerminologyServer: selectedTerminologyServer,
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
        const result = valueSets?.filter((i) => !selectedVSIds?.includes(i?.id))
        setValueSets(result)
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
  }, [fetchError])

  // search page requires the target grouper to be selected, 'add-grouper' context does not
  const buttonDisabled = tableContext === 'search-page' ? !selectedValueSets.length || !selectedGroupers.length : !selectedValueSets.length

  let errorMessageComponent = null
  if (vsNumExceedsFilterLimit) {
    errorMessageComponent = (
      <ErrorText>
        {searchTotal} results
        <br />
        Refine search to enable filters (max {PAGINATION_MAXIMUM} results)
      </ErrorText>
    )
  } else if (searchTerm.length < 3 && searchTerm.length > 0) {
    errorMessageComponent = <ErrorText>Minimum 3 characters required</ErrorText>
  }

  const handleSearchToggleChange = useCallback(
    debounce(
      (_evt, e: TableContextOptions) => {
        setSearchTableContext(e)
      },
      500,
      { trailing: false, leading: true }
    ),
    []
  )

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
          <ToggleButtonGroup color="primary" value={searchTableContext} exclusive onChange={handleSearchToggleChange} aria-label="Platform">
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
                      menuPortalTarget={myDocument}
                      styles={reactSelectOptionStyle()}
                      options={terminologySources}
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
                      menuPortalTarget={myDocument}
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
                      return submitVSetSearch({ searchContext: 'search' })
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
                        navigator.clipboard.writeText(fetchError?.data || '')
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
          <DescriptionText style={{ marginBottom: '1rem', marginTop: '0rem' }}>* This search will only return <b>active</b> valuesets</DescriptionText>
          <SubmitSelectedForm hide={!selectedValueSets?.length}>
            <Row>
              <div>
                <StyledLabel id="aria-label" htmlFor="conditions-selector">
                  Conditions
                </StyledLabel>
                <SelectInputContainer>
                  <Select
                    menuPortalTarget={myDocument}
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
                    menuPortalTarget={myDocument}
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
