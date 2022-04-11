import { Bundle, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react'
import styled from 'styled-components'
import { SearchInput } from '../../components/SearchInput'
import { SearchTable } from '../../components/SearchTable'
import LoadingIndicator from '../../components/LoadingIndicator'
import { Button } from '../../components/buttons/Button'
import { PageTitle } from '../../components/Typography'

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
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> { // this gets the initial chart items for the page
      const response = await fetch(`api/valueset`)
      if(response.ok) {
        const { entry } = await response.json()
        setValueSets(entry)
        setIsLoading(false)
      } else {
        setValueSets([])
        setIsLoading(false)
      }
    }
    if (isLoading) {
      void getValueSetsAndFilters()
    }
  })

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitSearch = async (event: SyntheticEvent) => { 
    event.preventDefault()
    const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')
    let type: SearchType = 'name';
    
    if (oidRegex.test(searchTerm)) { type = 'oid'}

    const response = await fetch(`api/valueset/search?}&search=${searchTerm}&searchType=${type}`)

    if (type === 'oid') { // an OID search returns a single ValueSet that needs to be handled uniquely for the SearchTable component
      const valueSetResponse = await response.json() as ValueSet
      setValueSets([{ resource: valueSetResponse }])
    } else {
      const { entry } = await response.json() as Bundle
      setValueSets(entry)
    }
  }

  if (isLoading) {
    return <LoadingIndicator/>
  }

  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            e.preventDefault()
            setSearchTerm(e.target.value)
          }}
          id='vs-name-search'
          label='Search by Name'
          hasIcon={true}
          minWidth={400}
        />
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            e.preventDefault()
            setSearchTerm(e.target.value)
          }}
          id='vs-oid-search'
          label='Search by OID'
          hasIcon={true}
          minWidth={400}
        />
        <Button
          text='Submit Search'
          onClick={submitSearch}
        />
      </Row>
      <SearchTable valueSets={valueSets} />
    </Col>
  )
}

export default ValueSets
