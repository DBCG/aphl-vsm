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

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | BundleEntryItem[] | undefined>([])
  const [selectedValueSets, setSelectedValueSets] = useState<fhir4.ValueSet[] | []>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  // set search terms from inputs
  const [nameSearchTerm, setNameSearchTerm] = useState<string>('')
  const [oidSearchTerm, setOidSearchTerm] = useState<string>('')
  // set search term from inputs
  const [searchTerm, setSearchTerm] = useState<string>('')
  // const [searchType, setSearchType] = useState<'name' | 'oid' | ''>('')

  // set conditions and groupers to be applied to valuesets
  const [selectedGroupers, setSelectedGroupers] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  // error info
  const [error, setError] = useState<Error | null>(null)
  const [fetchError, setFetchError] = useState<FetchError | null>(null)

  const conditions = useGetConditions()
  const groups = useGetGroups(programId)
  const allConditions = formatConditionsComposeInclude(conditions)

  const formattedGroups = useMemo(() => {
    if (!groups) return []
    return formatGrouperValueSets(groups)
  }, [groups])

  const handleSearchResponse = async (response: Response | undefined) => {
    if (response?.ok) {
      const valueSetResponse = await response.json() as SearchResponse
      setValueSets(valueSetResponse.valueSets)
      setFetchError(valueSetResponse.error || null)
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

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitVSetSearch = async (e: SyntheticEvent) => {
    console.log('this runs')
    e.preventDefault()

    let response
    if (error || !searchTerm || !searchTerm?.trim()) {
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
    response = await fetch(`/api/valueset/search?search=${searchStr}&searchType=${searchType}`)

    await handleSearchResponse(response)
  }

  const submitAddVSet = async (e: SyntheticEvent) => {
    e.preventDefault()
    let response
    // handle errors (e.g. if no grouper, no condition)
    // if (error) {
    //   return
    // }
    // setIsLoading(true)

    if (!selectedValueSets.length || !selectedConditions.length || !selectedGroupers.length) {
      console.error('missing data')
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
          autoClose={false}
          closeOnClick={false}
        />
        <PageTitle>ValueSet Search: {programId}</PageTitle>
        <Row>
          <SearchInput
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value) }
            id='vs-search'
            label='Search by Name or OID'
            hasIcon={true}
            minWidth={300}
          />
          <IconButton
            style={{ alignSelf: 'flex-end', marginTop: '12px' }}
            buttonContext='search'
            onClick={(e) => submitVSetSearch(e)}
          />
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
                options={buildConditionOptions(allConditions, selectedConditions)}
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
                options={formattedGroups}
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
        // @ts-ignore-next-line
        isLoading
          ? <LoadingIndicator />
          : <SearchTable
            valueSets={valueSets || []}
            setSelectedValueSets={setSelectedValueSets}
          />
      }
    </Col>
  )
}

export default ValueSets
