import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import ReactModal from 'react-modal'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.min.css'
import { useGetConditions } from '@/hooks/useGetConditions'
import {
  buildConditionOptions,
  formatConditionsComposeInclude
} from '@/helpers/conditionHelpers'
import { StyledLabel } from '@/components/SearchInput'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { IconButton } from '@/components/buttons/IconButton'
import { dedupeArray } from '@/helpers/dedupeArray'
import { useGetGroups } from '@/hooks/useGetGroups'
import { SearchResponse, FetchError } from 'pages/api/valueset/search'
import { getSession, GetSessionParams } from 'next-auth/react'
import { formatValuesetDate } from '@/helpers/formatDates'
import { TextArea } from '@/components/TextArea'
import { terminologyServerEndpoints } from 'fhirClientOptions'

const searchTypes = [
  { label: 'OID', value: 'oid' },
  { label: 'Name', value: 'name' },
  { label: 'URL', value: 'url'}
]

const searchInfoText = {
  oid: 'OID search supports a comma-delimited list, max 100 OIDs',
  name: 'Name search finds full or partial matches within VS name',
  url: 'URL search requires a full URL'
}

const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')

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
  justify-content: flex-end;
  column-gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

interface SubmitProps {
  hide: boolean
}

const SubmitSelectedForm = styled.form<SubmitProps>`
  padding: 12px 18px;
  background-color: var(--theme-100);
  max-height: ${props => props.hide ? '0' : '1000px'};
  padding: ${props => props.hide ? '0' : 'auto'};
  transition: all 0.3s;
`

const InnerFormRow = styled.div`
  display: flex;
  flex-direction: row;
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

const ModalContent = styled.div`  
  display: flex;
  height: 80%;
  flex-direction: row;
  justify-content: center;
  align-self: center;
  align-items: center;
`

const ModalColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-self: center;
  justify-content: center;
  align-items: center;
  text-align: center;
`

const ModalTitle = styled.h1`
`


const ErrorBlock = styled.div`
  background-color: white;
  border-left: 2px solid red;
  border-bottom: 2px solid red;
  padding: 4px 6px;
  margin-top: 12px;
  position: relative;
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
const paginationMaximum = 100

const columnSortMap = {
  1: 'name',
  3: 'lastupdated',
  4: 'version',
  5: 'publisher'
}

interface Error {
  type: 'invalid-oid' | 'missing-data' | 'oid-not-found' 
  message: string
}

const formatGrouperValueSets = (grouperVsets: fhir4.ValueSet[]) => {
  if (!grouperVsets) return []
  return grouperVsets?.map((vSet: fhir4.ValueSet) => ({
    label: vSet?.title?.replace('_', ''),
    url: vSet.url,
    version: vSet.version,
    id: vSet.id,
    value: vSet.url
  }))
}

const copyText = (txt: string) => navigator.clipboard.writeText(txt);

interface SearchReponseParams {
  searchContext: 'filter' | 'search',
  response: Response | undefined
}

const defaultOffsets = {
  first: '0',
  next: null,
  previous: null,
  last: null
}

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | undefined>([])
  const [filteredVSets, setFilteredVSets] = useState<fhir4.ValueSet[] | undefined>([])
  const [selectedValueSets, setSelectedValueSets] = useState<fhir4.ValueSet[] | []>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [addedValueSetsLoading, setAddedValueSetsLoading] = useState<boolean>(false)
  // set search term from input
  
  // Paging & search info
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [searchTotal, setSearchTotal] = useState<null | number>(null)
  const [offsets, setOffsets] = useState(defaultOffsets)
  const [currentPage, setCurrentPage] = useState({ type: 'self', page: 1 })
  const [resultsPerPage, setResultsPerPage] = useState(10)

  // filters
  const [findInName, setFindInName] = useState('')
  const [findInSteward, setFindInSteward] = useState('')
  const [findInStatus, setFindInStatus] = useState('')
  const [findInOid, setFindInOid] = useState('')
  const [findInLastUpdated, setFindInLastUpdated] = useState('')
  const [findInVersion, setFindInVersion] = useState('')
  const [sortParams, setSortParams] = useState({ column: 'name', direction: 'asc' })

  // set default terminology server for search
  const [selectedTerminologyServer, setSelectedTerminologyServer] = useState(terminologyServerEndpoints[0])
  const [searchTypeTest, setSearchTypeTest] = useState(searchTypes[0])

  // set conditions and groupers to be applied to valuesets
  const [selectedGroupers, setSelectedGroupers] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  // error info
  // const [addValueSetError, setAddValueSetError] = useState<Error | null>(null)
  const [fetchError, setFetchError] = useState<FetchError | null>(null)

  const conditions = useGetConditions()
  const groups = useGetGroups(programId)
  const allConditions = formatConditionsComposeInclude(conditions)

  const formattedGroups = useMemo(() => {
    if (!groups) return []
    return formatGrouperValueSets(groups)
  }, [groups])

  // take the response from the server and parse the important data
  const handleSearchResponse = async ({ searchContext, response }: SearchReponseParams) => {
    if (response?.ok) {
      const valueSetResponse = await response.json() as SearchResponse
      
      const newOffsets = {
        first: valueSetResponse?.first || null,
        next: valueSetResponse?.next || null,
        previous: valueSetResponse?.previous || null,
        last: valueSetResponse?.last || null
      }

      // @ts-expect-error
      setOffsets(newOffsets)

      if (searchContext === 'filter') {
        setFilteredVSets(valueSetResponse.valueSets)
        setFetchError(valueSetResponse.error || null)
        // what to do with total when filtered? probably fine
      } else {
        setValueSets(valueSetResponse.valueSets)
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
    setIsLoading(false)
  }

  const filterExists = findInName?.length
    || findInStatus?.length
    || findInSteward?.length
    || findInOid?.length
    || findInLastUpdated?.length
    || findInVersion?.length

  // handle filters
  useEffect(() => {
    if (!filterExists) {
      setFilteredVSets([])
      return
    }
    // if there are no valuesets, don't filter
    if (!valueSets || !valueSets.length) return
    // if there are less than paginationMaximum, filter in FE synchronously
    if (valueSets.length < paginationMaximum) {
      let filteredValueSets = valueSets as fhir4.ValueSet[]
      if (findInOid.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => {
            const oid = vs?.id?.split('|')?.[0]
            return oid?.includes(findInOid)
          }
        )
      }
      if (findInName?.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => vs?.name?.toLowerCase()?.includes(findInName?.toLocaleLowerCase())
          )
      }
      if (findInStatus?.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => vs?.status === findInStatus
        )
      }
      if (findInVersion?.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => vs?.version?.toLowerCase()?.includes(findInVersion?.toLocaleLowerCase())
        )
      }
      if (findInSteward?.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => vs?.publisher?.toLowerCase()?.includes(findInSteward?.toLocaleLowerCase())
        )
      }
      if (findInLastUpdated?.length) {
        filteredValueSets = filteredValueSets?.filter(
          (vs: fhir4.ValueSet) => {
            const lastUpdateDate = formatValuesetDate(
              { valueSet: vs, dateType: 'lastUpdated' }
            ) 
            return lastUpdateDate?.includes(findInLastUpdated)
            })
      }
      setFilteredVSets(filteredValueSets)
      return
    }

    let active = true
    filter()
    return () => { active = false }

    async function filter() {
      await submitVSetSearch()
      if (!active) { return }
    }
  }, [
    valueSets, findInName, findInStatus,
    findInSteward, findInOid, findInLastUpdated,
    findInVersion, currentPage,
    resultsPerPage, sortParams
  ])


  useEffect(() => {
    if (!searchTerm) return
    let loading = true
    setIsLoading(loading)
    search()
    return () => {
      loading = false
      setIsLoading(loading)
    }
    async function search() {
      await submitVSetSearch()
    }
  }, [currentPage, resultsPerPage, sortParams, selectedTerminologyServer])

  // unused for now because VSAC FHIR does not seem support _filter params...
  const handleSort = (column: any, sortDirection: 'asc' | 'desc') => {
    // @ts-expect-error
    const columnToSort = columnSortMap[column.id]
    setSortParams({
      column: columnToSort,
      direction: sortDirection
    })
  }

  const handlePageChange = (newPage: number) => {
    // don't call if same page
    if (newPage == currentPage.page) return
    const pageChangeState = {
      type: 'self',
      page: newPage
    }
    if (newPage == currentPage.page - 1) {
      pageChangeState.type = 'previous'
    } else if (newPage == currentPage.page + 1) {
      pageChangeState.type = 'next'
    } else if (newPage < currentPage.page) {
      pageChangeState.type = 'first'
    } else if (newPage > currentPage.page) {
      pageChangeState.type = 'last'
    }

    setCurrentPage(pageChangeState)
  }

  const handlePerRowsChange = (rows: number) => {
    setResultsPerPage(rows)
  }

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitVSetSearch = async (e?: SyntheticEvent) => {
    if (e) {
      e.preventDefault()
    }

    let response
    if (!searchTerm?.trim()) {
      return
    }

    setIsLoading(true)
    
    let searchStr = ''
    
    if (searchTypeTest.value === 'oid') {
      const trimmedWords = searchTerm?.trim()?.split(',')?.map(term =>term?.trim())
      const dedupedOids = dedupeArray(trimmedWords)
      // if more than 100 OIDs, exit with error
      if (dedupedOids?.length > paginationMaximum) {
        const message = `OID search maximum is ${paginationMaximum} at a time.`
        setIsLoading(false)
        toast.error(message)
        return
      }
      searchStr = dedupedOids?.join(',')
    } else if (searchTypeTest.value === 'name') {
      searchStr = searchTerm.trim()
    } else if (searchTypeTest.value === 'url') {
      searchStr = searchTerm.trim()
    }

    // @ts-ignore-next-line
    let offset = offsets?.[currentPage?.type] || ''
    let queryStringItems = {
      searchType: searchTypeTest?.value,
      count: resultsPerPage,
      sortBy: sortParams?.column,
      sortDirection: sortParams?.direction,
      offset: offset,
      terminologyServer: selectedTerminologyServer?.value?.title
    }

    let queryString = ''
    
    Object.keys(queryStringItems).forEach(key => queryString += `&${key}=${queryStringItems[key]}`)

    const endpoint = `/api/valueset/search?search=${searchStr}${queryString}`

    response = await fetch(endpoint)

    const searchContext = filterExists ? 'filter' : 'search'
    await handleSearchResponse({ searchContext, response })
  }

  const submitAddVSet = async (e: SyntheticEvent) => {
    e.preventDefault()
    setAddedValueSetsLoading(true)

    if (!selectedValueSets.length || !selectedGroupers.length) {
      const message = 'Select at least one valueset with an associated group. (Conditions optional)'
      toast.error(message)
      setAddedValueSetsLoading(false)
      return
    }


    const leafPutBody = JSON.stringify({
      selectedValueSets,
      selectedConditions,
      selectedGroupers
    })
  
    // needs some error handling down here
    const leafsUpdated = await fetch('/api/valueset', {
      method: 'PUT',
      body: leafPutBody
    })

    if (leafsUpdated.ok) {
      setSearchTerm('')
      setSelectedConditions([])
      setSelectedGroupers([])
      toast.success('ValueSet Add Successful')
    }
   
    // why does this not work?
    setSelectedValueSets([])
    setAddedValueSetsLoading(false)
  }

  useEffect(() => {
    if (fetchError?.message && fetchError?.errorType !== 'failed-oids') {
      toast.error(fetchError.message)
    }
  }, [fetchError?.message])

  const showFilters = Boolean(searchTotal)
    && Boolean(searchTotal && searchTotal > -1 && searchTotal <= paginationMaximum)

  const vsNumExceedsFilterLimit = searchTotal && searchTotal > paginationMaximum

  return (
    <Col>
      <ReactModal isOpen={addedValueSetsLoading}>
        <ModalContent>
          <ModalColumn>
            <LoadingIndicator size='large'/>
            <ModalTitle>Saving Valuesets to Program</ModalTitle>
          </ModalColumn>
        </ModalContent>
      </ReactModal>
      <TitleRow>
        <ToastContainer
          closeOnClick={false}
        />
        <PageTitle>Add ValueSets to Program: {programId}</PageTitle>
        <Row>
          <StyledForm>
            <div>
              <InnerFormRow>
                <div style={{ marginBottom: '12px' }}>
                  <StyledLabel id="aria-label" htmlFor="terminology-server-selector">
                    Terminology Source
                  </StyledLabel>
                  <SelectInputContainer>
                    <Select
                      isMulti={false}
                      // @ts-ignore-next-line
                      options={terminologyServerEndpoints}
                      value={selectedTerminologyServer}
                      onChange={(e: any) => {
                        return (setSelectedTerminologyServer(e))
                      }
                      }
                    />
                  </SelectInputContainer>
                </div>
              </InnerFormRow>
              <InnerFormRow>
                <div style={{ marginBottom: '16px' }}>
                  <StyledLabel id="aria-label" htmlFor="terminology-server-selector">
                    Search By ValueSet
                  </StyledLabel>
                  <SelectInputContainer>
                    <Select
                      isMulti={false}
                      // @ts-ignore-next-line
                      options={searchTypes}
                      value={searchTypeTest}
                      onChange={(e: any) => {
                        return (setSearchTypeTest(e))
                      }}
                    />
                  </SelectInputContainer>
                </div>
              </InnerFormRow>
              <InnerFormRow>
                <TextArea
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value) }
                  id='vs-search'
                  label='Search Text'
                  hasIcon={true}
                  includeInfo={true}
                  info='OID search supports a comma-delimited list, max 100 OIDs'
                  minWidth={300}
                />
                <IconButton
                  style={{ alignSelf: 'flex-end', marginTop: '12px', marginLeft: '12px' }}
                  buttonContext='search'
                  type='submit'
                  onClick={(e) => submitVSetSearch(e)}
                />
              </InnerFormRow>
              { vsNumExceedsFilterLimit &&
                <ErrorText>
                  {searchTotal} results<br/>Refine search to enable filters (max {paginationMaximum} results)
                </ErrorText>
              }
              {
                fetchError?.errorType === 'failed-oids'
                  ? <ErrorBlock>
                      <ErrorBlockText>Search for these OIDs failed:</ErrorBlockText>
                      <ErrorBlockText>{fetchError?.data}</ErrorBlockText>
                      <ErrorBlockText>They may be malformed or nonexistent.</ErrorBlockText>
                      <CopyButton
                        onClick={(e) => {
                          e.preventDefault()
                          toast.success('Copied failed OIDs to clipboard!')
                          copyText(fetchError?.data || '')}
                        }
                        title='Copy Failed OIDs'>
                        <Image src='/images/clipboard-outline.svg' alt='Copy' width={16} height={16}/>
                      </CopyButton>
                    </ErrorBlock>
                  : null
              }
            </div>
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
                isMulti={true}
                // @ts-ignore-next-line
                options={buildConditionOptions(allConditions, selectedConditions)}
                value={selectedConditions}
                onChange={(e: any) => (setSelectedConditions(e))}
              />
            </SelectInputContainer>
          </div>
          <div>
            <StyledLabel id="aria-label" htmlFor="conditions-selector">
              Groups
            </StyledLabel>
            <SelectInputContainer>
              <Select
                isMulti={true}
                // @ts-ignore-next-line
                options={formattedGroups}
                value={selectedGroupers}
                onChange={(e: any) => {
                  setSelectedGroupers(e)
                }}
              />
            </SelectInputContainer>
          </div>
        <Button text='Add Selected To Program'
          disabled={!selectedValueSets.length}
          style={{ maxHeight: '60px', alignSelf: 'end', justifySelf: 'flex-end' }}
          onClick={(e) => submitAddVSet(e)}
        />
        </Row>
      </SubmitSelectedForm>
      <SearchTable
        searchType={searchTypeTest.value}
        valueSets={!filterExists ? (valueSets || []) : filteredVSets}
        setSelectedValueSets={setSelectedValueSets}
        setFindInName={setFindInName}
        setFindInSteward={setFindInSteward}
        setFindInStatus={setFindInStatus}
        setFindInOid={setFindInOid}
        setFindInLastUpdated={setFindInLastUpdated}
        setFindInVersion={setFindInVersion}
        showFilters={showFilters}
        // handle this loader to make sure status doesn't move table
        isLoading={isLoading}
        resultsPerPage={resultsPerPage}
        paginationTotalRows={searchTotal || 0}
        handlePageChange={handlePageChange}
        handlePerRowsChange={handlePerRowsChange}
      />
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default ValueSets
