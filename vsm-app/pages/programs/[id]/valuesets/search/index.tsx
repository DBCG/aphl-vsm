import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import ReactModal from 'react-modal'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.min.css'
import { useGetConditions } from '@/hooks/useGetConditions'
import { buildConditionOptions, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'
import { SearchInput, StyledLabel } from '@/components/SearchInput'
import { BundleEntryItem, SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { IconButton } from '@/components/buttons/IconButton'
import { dedupeArray } from '@/helpers/dedupeArray'
import { useGetGroups } from '@/hooks/useGetGroups'
import { SearchResponse, FetchError } from 'pages/api/valueset/search'
import { getSession, GetSessionParams } from 'next-auth/react'
import { formatValuesetDate } from '@/helpers/formatDates'

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
  flex-direction: row;
  justify-content: center;
  align-items: center;
`

const ModalColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-self: center;
  text-align: center;
`

const ModalTitle = styled.h1`
`

const paginationMaximum = 100

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

interface SearchReponseParams {
  searchContext: 'filter' | 'search',
  response: Response | undefined
}

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | undefined>([])
  const [searchTotal, setSearchTotal] = useState<null | number>(null)
  const [filteredVSets, setFilteredVSets] = useState<fhir4.ValueSet[] | undefined>([])
  const [selectedValueSets, setSelectedValueSets] = useState<fhir4.ValueSet[] | []>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [addedValueSetsLoading, setAddedValueSetsLoading] = useState<boolean>(false)
  // set search term from input
  // TODO REMOVE THIS
  const [searchTerm, setSearchTerm] = useState<string>('')

  // filters
  const [findInName, setFindInName] = useState('')
  const [findInSteward, setFindInSteward] = useState('')
  const [findInStatus, setFindInStatus] = useState('')
  const [findInOid, setFindInOid] = useState('')
  const [findInLastUpdated, setFindInLastUpdated] = useState('')
  const [findInVersion, setFindInVersion] = useState('')
  const [findInKeyword, setFindInKeyword] = useState('')

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

  const handleSearchResponse = async ({ searchContext, response }: SearchReponseParams) => {
    if (response?.ok) {
      const valueSetResponse = await response.json() as SearchResponse
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
    || findInKeyword?.length

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
      } else if (findInName?.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.name?.toLowerCase()?.includes(findInName?.toLocaleLowerCase()))
      } else if (findInStatus?.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.status === findInStatus)
      } else if (findInVersion?.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.version?.toLowerCase()?.includes(findInVersion?.toLocaleLowerCase()))
      } else if (findInSteward?.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.publisher?.toLowerCase()?.includes(findInSteward?.toLocaleLowerCase()))
      } else if (findInKeyword?.length) {
        filteredValueSets = filteredValueSets?.filter((vs: fhir4.ValueSet) => {
          const extensionKeywords = vs?.extension
          ?.filter(ext => ext?.url?.endsWith('keyWord'))
          ?.map(xt => xt?.valueString?.toLowerCase())

          const matches = extensionKeywords?.filter((keyword) => keyword?.includes(findInKeyword?.toLowerCase()))
          return Boolean(matches && matches?.length) 

        })
      } else if (findInLastUpdated?.length) {
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
      // setResult(undefined) // this is optional
      await submitVSetSearch()
      if (!active) { return }
      // setResult(res)
    }
  }, [
    valueSets, findInName, findInStatus,
    findInSteward, findInOid, findInLastUpdated,
    findInVersion, findInKeyword
  ])

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
    const trimmedWords = searchTerm?.trim()?.split(',')?.map(term =>term?.trim())
    const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')
    let searchType = ''
    let searchStr = ''

    if (trimmedWords?.some(word => word?.match(oidRegex))) {
      searchType = 'oid'
      const dedupedOids = dedupeArray(trimmedWords)
      // if more than 100 OIDs, exit with error
      if (dedupedOids?.length > paginationMaximum) {
        const message = `OID search maximum is ${paginationMaximum} at a time.`
        setIsLoading(false)
        toast.error(message)
        return
      }
      searchStr = dedupedOids?.join(',')
    } else {
      searchType = 'name'
      searchStr = searchTerm.trim()
    }

    let endpoint = `/api/valueset/search?search=${searchStr}&searchType=${searchType}`

    response = await fetch(endpoint)

    const searchContext = filterExists ? 'filter' : 'search'
    await handleSearchResponse({ searchContext, response })
  }

  const submitAddVSet = async (e: SyntheticEvent) => {
    e.preventDefault()
    setAddedValueSetsLoading(true)
    let response

    if (!selectedValueSets.length || !selectedConditions.length || !selectedGroupers.length) {
      const message = 'Select at least one valueset, with an associated condition and group.'
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

    setAddedValueSetsLoading(false)
  }

  useEffect(() => {
    if (fetchError?.message) {
      toast.error(fetchError.message)
    }
  }, [fetchError?.message])

  const showFilters = Boolean(searchTotal) && Boolean(searchTotal && searchTotal > -1 && searchTotal <= paginationMaximum)
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
        <PageTitle>ValueSet Search: {programId}</PageTitle>
        <Row>
          <StyledForm>
            <div>
              <InnerFormRow>
                <SearchInput
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value) }
                  id='vs-search'
                  label='Search by Name or OID'
                  value={searchTerm}
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
                <ErrorText>{searchTotal} results<br/>Refine search to enable filters (max {paginationMaximum} results)</ErrorText>
              }
            </div>
          </StyledForm>
        </Row>
      </TitleRow>
      <form>
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
          style={{ maxHeight: '60px', alignSelf: 'end', justifySelf: 'flex-end' }}
          onClick={(e) => submitAddVSet(e)}
        />
        </Row>

      </form>
      <SearchTable
        valueSets={!filterExists ? (valueSets || []) : filteredVSets}
        setSelectedValueSets={setSelectedValueSets}
        setFindInName={setFindInName}
        setFindInSteward={setFindInSteward}
        setFindInStatus={setFindInStatus}
        setFindInOid={setFindInOid}
        setFindInLastUpdated={setFindInLastUpdated}
        setFindInVersion={setFindInVersion}
        setFindInKeyword={setFindInKeyword}
        showFilters={showFilters}
        // handle this loader to make sure status doesn't move table
        isLoading={isLoading}
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
