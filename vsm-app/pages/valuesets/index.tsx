import { Bundle, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { SearchInput } from '@/components/SearchInput'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { IconButton } from '@/components/buttons/IconButton'
import { dedupeArray } from '@/helpers/dedupeArray'

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

type SearchType = 'name' | 'oid' | 'steward'

const ValueSets = () => {
  const router = useRouter()
  const [valueSets, setValueSets] = useState<fhir4.ValueSet[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  // set search terms from inputs
  const [nameSearchTerm, setNameSearchTerm] = useState<string>('')
  const [oidSearchTerm, setOidSearchTerm] = useState<string>('')
  // error info
  const [error, setError] = useState()

  const handleFetchResponse = async (response: Response, type?: SearchType) => {
    if (response?.ok && type === 'oid') {
      const valueSetResponse = await response.json() as ValueSet[]
      setValueSets(valueSetResponse)
      setIsLoading(false)
    } else if (response.ok) {
      const { entry } = await response.json() as Bundle
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
    console.log('got here')
    e.preventDefault()
    let response
    if (oidSearchTerm && nameSearchTerm) {
      setError({ error: 'Please search only one field, cannot be combined' })
      return
    }
    setIsLoading(true)

    let searchType: SearchType = 'name'
    if (nameSearchTerm) {
      response = await fetch(`api/valueset/search?search=${nameSearchTerm}&searchType=${searchType}`)
    } else if (oidSearchTerm) {
      searchType = 'oid'
      const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')

      // trim whitespace from entire search term and internal oids
      const trimmedSearch: string[] = dedupeArray(oidSearchTerm?.trim()?.split(',')?.map(item => item?.trim()))
      const allTermsAreOid = Boolean(trimmedSearch.filter(oid => !oidRegex.test(oid)))

      if (allTermsAreOid) {
        response = await fetch(`api/valueset/search?search=${trimmedSearch.join(',')}&searchType=${searchType}`) 
      }
    }

    await handleFetchResponse(response, searchType)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, type: 'name' | 'oid'): void => {
    e.preventDefault()
    console.log('e: ', e)
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
              label='Search by Name'
              hasIcon={true}
              minWidth={400}
              style={{ marginBottom: '12px'}}
            />
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'oid')}
              id='vs-oid-search'
              label='Search by OID'
              hasIcon={true}
              minWidth={400}
          
            />
            <IconButton
              style={{ alignSelf: 'flex-end', marginTop: '12px' }}
              buttonContext='search'
              onClick={(e) => submitSearch(e)}
            />
          </Col>
          <Button text='Add Selected To Program'
            style={{ maxHeight: '10px'}}
            onClick={onClick}
          />
        </Row>
      </form>
      {
        isLoading ? <LoadingIndicator /> : <SearchTable valueSets={valueSets} />
      }
    </Col>
  )
}

export default ValueSets
