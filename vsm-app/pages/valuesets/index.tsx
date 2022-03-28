import { Bundle } from 'fhir/r4'
import { SyntheticEvent, useEffect, useState } from 'react'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'
import { SearchTable } from '../../components/SearchTable'
import { CodeSystemFilters } from '../api/codesystem/filters'

const defaultBaseUrl = 'https://cts.nlm.nih.gov/fhir'

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

const ValueSets = () => {
  const [valueSetsAndFilters, setValueSetsAndFilters] = useState<ValueSetsAndFilters>({
    valueSets: [],
    filters: []
  })

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> { // this gets the initial chart items for the page
      const responses = await Promise.all([
        fetch(`api/valueset?baseUrl=${defaultBaseUrl}`),
        fetch(`api/codesystem/filters?baseUrl=${defaultBaseUrl}`)
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
    const response = await fetch(`api/valueset/search?baseUrl=${defaultBaseUrl}&search=${event.target.search.value}`)
    const { entry } = await response.json() as Bundle
    console.info({...valueSetsAndFilters, valueSets: entry})
    setValueSetsAndFilters({...valueSetsAndFilters, valueSets: entry})
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
