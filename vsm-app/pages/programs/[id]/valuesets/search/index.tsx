import { Bundle, BundleEntry, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ToastContainer, toast } from 'react-toastify'
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
import 'react-toastify/dist/ReactToastify.min.css'
import { getSession, GetSessionParams } from 'next-auth/react'

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

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ErrorText = styled.span`
  color: darkRed;
  font-size: 90%;
`

const SelectInputContainer = styled.div`
  min-width: 300px;
`

const paginationMaximum = 100

type SearchType = 'name' | 'oid' | 'steward'

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

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | BundleEntryItem[] | undefined>([])
  const [filteredVSets, setFilteredVSets] = useState<fhir4.ValueSet[] | BundleEntryItem[] | undefined>([])
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

  // set conditions and groupers to be applied to valuesets
  const [selectedGroupers, setSelectedGroupers] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  // error info
  const [addValueSetError, setAddValueSetError] = useState<Error | null>(null)
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
      } else {
        setValueSets(valueSetResponse.valueSets)
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

  const filterExists = findInName.length
    || findInStatus.length
    || findInSteward.length
    || findInOid.length

  // handle filters
  useEffect(() => {
    if (!filterExists) {
      setFilteredVSets([])
      return
    }
    // if there are no valuesets, don't filter
    if (!valueSets || !valueSets.length) return
    // if there are less than <max> valuesets, filter in FE synchronously
    if (valueSets.length < paginationMaximum) {
      let filteredValueSets = valueSets
      if (findInOid.length) {
        filteredValueSets = filteredValueSets?.filter(
          vs => {
            const oid = vs.id.split('|')[1]
            return oid?.includes(findInOid)
          }
        )
        console.log('filtered: ', filteredValueSets)
      } else if (findInName.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.name?.toLowerCase()?.includes(findInName?.toLocaleLowerCase()))
      } else if (findInStatus.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.status === findInStatus)
      } else if (findInSteward.length) {
        filteredValueSets = filteredValueSets?.filter(vs => vs?.publisher?.toLowerCase()?.includes(findInSteward?.toLocaleLowerCase()))
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
  }, [valueSets, findInName, findInStatus, findInSteward, findInOid])

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
      searchStr = dedupedOids?.join(',')
    } else {
      searchType = 'name'
      searchStr = searchTerm.trim()
    }

    let endpoint = `/api/valueset/search?search=${searchStr}&searchType=${searchType}`
    if (findInName.length) {
      endpoint += `&nameFilter=${findInName}`
    } if (findInStatus.length) {
      endpoint += `&statusFilter=${findInStatus}`
    } if (findInOid.length) {
      endpoint += `&oidFilter=${findInOid}`
    } if (findInSteward.length) {
      endpoint += `&stewardFilter=${findInSteward}`
    }

    response = await fetch(endpoint)

    const searchContext = filterExists ? 'filter' : 'search'

    await handleSearchResponse({ searchContext, response })
  }

  const submitAddVSet = async (e: SyntheticEvent) => {
    e.preventDefault()
    setAddedValueSetsLoading(true)
    let response

    if (!selectedValueSets.length || !selectedConditions.length || !selectedGroupers.length) {
      const message = 'You must select at least one valueset, with an associated condition and group.'
      toast.error(message)
      return
    }

    const leafPutBody = JSON.stringify({
      selectedValueSets,
      selectedConditions,
      selectedGroupers
    })
  
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

  }

  useEffect(() => {
    if (fetchError?.message) {
      toast.error(fetchError.message)
    }
  }, [fetchError?.message])

  return (
    <Col>
      <TitleRow>
        <ToastContainer
          closeOnClick={false}
        />
        <PageTitle>ValueSet Search: {programId}</PageTitle>
        <Row>
          <StyledForm>
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value) }
              id='vs-search'
              label='Search by Name or OID'
              value={searchTerm}
              hasIcon={true}
              minWidth={300}
            />
            <IconButton
              style={{ alignSelf: 'flex-end', marginTop: '12px' }}
              buttonContext='search'
              type='submit'
              onClick={(e) => submitVSetSearch(e)}
            />
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
      {
        <SearchTable
          valueSets={!filterExists ? (valueSets || []) : filteredVSets}
          setSelectedValueSets={setSelectedValueSets}
          setFindInName={setFindInName}
          setFindInSteward={setFindInSteward}
          setFindInStatus={setFindInStatus}
          setFindInOid={setFindInOid}
          // handle this loader to make sure status doesn't move table
          isLoading={isLoading}
        />
      }
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
