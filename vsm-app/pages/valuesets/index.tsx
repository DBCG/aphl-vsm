import { Bundle, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react'
import styled from 'styled-components'
import { SearchInput } from '@/components/SearchInput'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'

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
  const [valueSets, setValueSets] = useState<Bundle['entry']>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const handleFetchResponse = async (response: Response, type?: SearchType) => {
    if(response.ok && type === 'oid') { // an OID search returns a single ValueSet that needs to be handled uniquely for the SearchTable component
        const valueSetResponse = await response.json() as ValueSet
        setValueSets([{ resource: valueSetResponse }])
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

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> { // this gets the initial chart items for the page
      const response = await fetch(`api/valueset`)
      await handleFetchResponse(response)
    }

    if (isLoading) {
      void getValueSetsAndFilters()
    }
  },[])

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitSearch = async (event: SyntheticEvent) => { 
    event.preventDefault()
    setIsLoading(true)
    const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')
    let type: SearchType = 'name';
    if (oidRegex.test(searchTerm)) { type = 'oid'}

    const response = await fetch(`api/valueset/search?}&search=${searchTerm}&searchType=${type}`)
    await handleFetchResponse(response, type)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    e.preventDefault()
    const { target: { value }} = e
    setSearchTerm(value)
  }

  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <form>
        <Row>
          <SearchInput
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(e) }
            id='vs-name-search'
            label='Search by Name'
            hasIcon={true}
            minWidth={400}
          />
          <SearchInput
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(e)}
            id='vs-oid-search'
            label='Search by OID'
            hasIcon={true}
            minWidth={400}
          />
          <Button
            type='submit'
            text='Submit Search'
            onClick={submitSearch}
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
