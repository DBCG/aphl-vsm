import { Bundle, BundleEntry, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react'
import Select from 'react-select'
import { useRouter } from 'next/router'
import styled from 'styled-components'
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

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 1rem;
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

type SearchType = 'name' | 'oid' | 'steward'

interface Error {
  type: 'search-overload' | 'oid-not-found'
  message: string
}

const formatGrouperValueSets = (grouperVsets: fhir4.ValueSet[]) => {
  return grouperVsets?.map((vSet: fhir4.ValueSet) => ({
    label: vSet.title.replace('_', ''),
    url: vSet.url,
    version: vSet.version,
    dataId: `${vSet.url}|${vSet.version}`
  }))
}

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  const [valueSets, setValueSets] = useState<fhir4.ValueSet[] | BundleEntryItem[] | undefined>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  // set search terms from inputs
  const [nameSearchTerm, setNameSearchTerm] = useState<string>('')
  const [oidSearchTerm, setOidSearchTerm] = useState<string>('')
  // set conditions and groupers to be applied to valuesets
  const [selectedGroupers, setSelectedGroupers] = useState([])
  const [selectedConditions, setSelectedConditions] = useState([])
  // error info
  const [error, setError] = useState<Error | null>(null)

  const conditions = useGetConditions()
  const groups = useGetGroups(programId)
  const allConditions = formatConditionsComposeInclude(conditions)
  console.log('allConditions: ', allConditions)
  console.log('groups: ', groups)

  let activeSearchType = null

  if (oidSearchTerm?.trim()?.length && nameSearchTerm?.trim()?.length) {
    activeSearchType = 'error'
  } else if (oidSearchTerm) {
    activeSearchType = 'oid'
  } else if (nameSearchTerm) {
    activeSearchType = 'name'
  }

  useEffect(() => {
    if (nameSearchTerm && oidSearchTerm) {
      setError({
        message: 'Cannot search by both OID and name',
        type: 'search-overload'
      })
    } else {
      setError(null)
    }

  }, [nameSearchTerm, oidSearchTerm])

  const handleSearchResponse = async (response: Response | undefined, type?: SearchType) => {
    if (response?.ok && type === 'oid') {
      const valueSetResponse = await response.json() as ValueSet[]
      setValueSets(valueSetResponse)
      setIsLoading(false)
    } else if (response?.ok) {
      const { entry } = await response.json()
      setValueSets(entry)
      setIsLoading(false)
    } else {
      setValueSets([])
      setIsLoading(false)
    }
  }

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitSearch = async (e: SyntheticEvent) => {
    e.preventDefault()
    let response
    if (error) {
      return
    }
    setIsLoading(true)

    let searchType: SearchType = 'name'
    if (nameSearchTerm) {
      response = await fetch(`/api/valueset/search?search=${nameSearchTerm}&searchType=${searchType}`)
    } else if (oidSearchTerm) {
      searchType = 'oid'
      const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')

      // trim whitespace from entire search term and internal oids
      const trimmedSearch: string[] = dedupeArray(oidSearchTerm?.trim()?.split(',')?.map(item => item?.trim()))
      const allTermsAreOid = Boolean(trimmedSearch.filter(oid => !oidRegex.test(oid)))

      if (allTermsAreOid) {
        response = await fetch(`/api/valueset/search?search=${trimmedSearch.join(',')}&searchType=${searchType}`) 
      }
    }

    await handleSearchResponse(response, searchType)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, type: 'name' | 'oid'): void => {
    e.preventDefault()
    const { target: { value } } = e

    if (type === 'name') {
      setNameSearchTerm(value)
    } else if (type === 'oid') {
      setOidSearchTerm(value)
    }
  }

  // @ts-expect-error
  const onClick = (e) => {
    e.preventDefault()
    router.push('/programs')
  }

  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <form>
        <Row>
          <Col style={{ maxWidth: '400px' }}>
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'name') }
              id='vs-name-search'
              label='Name'
              hasIcon={true}
              minWidth={400}
              style={{ marginBottom: '12px'}}
            />
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'oid')}
              id='vs-oid-search'
              label='OID'
              hasIcon={true}
              minWidth={400}
            />
            {error?.type === 'search-overload' && <ErrorText>{error.message}</ErrorText>}
            <StyledLabel id="aria-label" htmlFor="conditions-selector">
              Conditions
            </StyledLabel>
            <Select
              isMulti={true}
              options={buildConditionOptions(allConditions, selectedConditions)}
              onChange={(e) => (setSelectedConditions(e))}
            />
            <StyledLabel id="aria-label" htmlFor="conditions-selector">
              Groups
            </StyledLabel>
            <Select
              isMulti={true}
              options={formatGrouperValueSets(groups)}
              onChange={(e) => (setSelectedGroupers(e))}
            />
            <IconButton
              style={{ alignSelf: 'flex-end', marginTop: '12px' }}
              buttonContext='search'
              onClick={(e) => submitSearch(e)}
            />
          </Col>
          <Button text='Add Selected To Program'
            style={{ maxHeight: '60px'}}
            onClick={onClick}
          />
        </Row>
      </form>
      {
        // @ts-ignore-next-line
        isLoading ? <LoadingIndicator /> : <SearchTable valueSets={valueSets} activeSearchType={activeSearchType} />
      }
    </Col>
  )
}

export default ValueSets
