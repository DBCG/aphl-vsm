import { Bundle, ValueSet } from 'fhir/r4'
import { SyntheticEvent, useEffect, useState } from 'react'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'
import { SearchTable } from '../../components/SearchTable'
import { CodeSystemFilters } from '../api/codesystem/filters'

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
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

type SearchEvent = EventTarget & {
  search: Record<string, string>
}

const ValueSets = () => {
  const [valueSetsAndFilters, setValueSetsAndFilters] = useState<ValueSetsAndFilters>({
    valueSets: [],
    filters: []
  })

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> { // this gets the initial chart items for the page
      const responses = await Promise.all([
        fetch(`api/valueset`),
        fetch(`api/codesystem/filters`)
      ])

      const { entry } = await responses[0].json()
      setValueSetsAndFilters({
        valueSets: entry,
        filters: await responses[1].json()
      })
    }
    void getValueSetsAndFilters()
  }, [])

  /**
   *  When a user clicks the search button, an API call is made to the `/search` endpoint to query by name/OID/steward
   */
  const submitSearch = async (event: SyntheticEvent) => { 
    event.preventDefault()
    const oidRegex = new RegExp('^([0-2])((\.0)|(\.[1-9][0-9]*))*$')
    let type: SearchType = 'name';
    const { search: { value } } = event.target as SearchEvent
    
    if (oidRegex.test(value)) { type = 'oid'}

    const response = await fetch(`api/valueset/search?}&search=${value}&searchType=${type}`)

    if (type === 'oid') { // an OID search returns a single ValueSet that needs to be handled uniquely for the SearchTable component
      const valueSetResponse = await response.json() as ValueSet
      setValueSetsAndFilters({...valueSetsAndFilters, valueSets: [{ resource: valueSetResponse }]})
    } else {
      const { entry } = await response.json() as Bundle
      console.info(entry)
      setValueSetsAndFilters({...valueSetsAndFilters, valueSets: entry})
    }
  }

  const { valueSets } = valueSetsAndFilters

  // Currently using simple HTML form tags until styled components created
  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        <form onSubmit={submitSearch}>
          <input name="search" type="text" placeholder='Search by Name, OID, Steward' required/>
          <button type="submit">Search</button>
        </form>
      </Row>
      <SearchTable valueSets={valueSets} />
    </Col>
  )
}

export default ValueSets
