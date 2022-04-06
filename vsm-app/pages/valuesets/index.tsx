import { Bundle, ValueSet } from 'fhir/r4'
import { ChangeEvent, SyntheticEvent, useEffect, useState } from 'react'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { SearchTable } from '../../components/SearchTable'
import { CodeSystemFilters } from '../api/codesystem/filters'
import { Button } from '../../components/buttons/Button'
import LoadingIndicator from '../../components/LoadingIndicator'

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

interface ValueSetsAndFilters {
  valueSets: Bundle['entry']
  filters: CodeSystemFilters[] // currently unused. These are the codesystem filters derived from a Terminology Server Capability Statement
}

type SearchType = 'name' | 'oid' | 'steward'

const ValueSets = () => {
  const [valueSetsAndFilters, setValueSetsAndFilters] = useState<ValueSetsAndFilters>({
    valueSets: undefined,
    filters: []
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> { // this gets the initial chart items for the page
      const responses = await Promise.all([
        fetch(`api/valueset`),
        fetch(`api/codesystem/filters`)
      ])
      if(responses[0].ok) {
        const { entry } = await responses[0].json()
        setValueSetsAndFilters({
          valueSets: entry,
          filters: await responses[1].json()
        })
      } else {
        setValueSetsAndFilters({ ...valueSetsAndFilters, valueSets: []});
      }
    }
    void getValueSetsAndFilters()
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
      setValueSetsAndFilters({...valueSetsAndFilters, valueSets: [{ resource: valueSetResponse }]})
    } else {
      const { entry } = await response.json() as Bundle
      setValueSetsAndFilters({...valueSetsAndFilters, valueSets: entry})
    }
  }

  const { valueSets } = valueSetsAndFilters
  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        { valueSets? <>
            <SearchInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              id='program-search'
              label='Search by Name, OID'
              hasIcon={true}
              minWidth={400}
            />
            <Button
              text='Submit Search'
              onClick={submitSearch}
            />
          </>: <LoadingIndicator /> }
      </Row>
      <SearchTable valueSets={valueSets} />
    </Col>
  )
}

export default ValueSets
