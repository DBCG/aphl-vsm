import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'
import { SearchTable } from '../../components/SearchTable'
import { useEffect, useState } from 'react'

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
const ValueSets = () => {
  const [valueSetsAndFilters, setValueSetsAndFilters] = useState({
    valueSets: [],
    filters: []
  })

  useEffect(() => {
    async function getValueSetsAndFilters(): Promise<void> {
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

  const { valueSets, filters } = valueSetsAndFilters

  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        <SearchInput placeholder={`Default Terminology Server: ${defaultBaseUrl}`} />
        <Button text='Change Server' />
      </Row>
      <Row>
        <SearchInput placeholder='Search by ID, Name, Title' />
        <Button text='Add New Program' />
      </Row>
      <SearchTable valueSets={valueSets} />
    </Col>
  )
}

export default ValueSets
