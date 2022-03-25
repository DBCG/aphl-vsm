import type { NextPage } from 'next'
import type { Bundle, CapabilityStatement } from 'fhir/r4'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'
import { SearchTable } from '../../components/SearchTable'

const vsacBaseUrl = 'https://cts.nlm.nih.gov/fhir'

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
interface ValueSetProps {
  valueSetEntries: Bundle['entry']
  vsacCapabilityStatement: CapabilityStatement
}
interface CodeSystemFilters {
  valueUri: string
  valueString: string
}

const ValueSets: NextPage<ValueSetProps> = ({ valueSetEntries, vsacCapabilityStatement }) => {
  const codeSystemFilters = parseCapabilityStatement(vsacCapabilityStatement)

  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        <SearchInput placeholder='Search by ID, Name, Title' />
        <Button text='Add New Program' />
      </Row>
      <Row>
        <SearchTable valueSets={valueSetEntries} />
      </Row>
    </Col>
  )
}

const parseCapabilityStatement = (capabilityStatement: CapabilityStatement): CodeSystemFilters[]|undefined => {
  const filters = capabilityStatement.extension?.map(({ extension }) => {
    return {
      valueUri: extension?.find(({ url }) => url === 'system')?.valueUri,
      valueString: extension?.find(({ url }) => url === 'name')?.valueString
    } as CodeSystemFilters
  })

  return filters
}

export async function getStaticProps() {
  const { VSAC_USERNAME, VSAC_API_KEY } = process.env

  const headers = new Headers();
  const authString = `${VSAC_USERNAME}:${VSAC_API_KEY}`
  headers.set('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`)
  const fetchOptions = { method: 'GET', headers }

  const responses = await Promise.all([
    fetch(`${vsacBaseUrl}/ValueSet?_count=25`, fetchOptions ),
    fetch(`${vsacBaseUrl}/metadata`, fetchOptions)
  ])
  
  const { entry } = await responses[0].json()
  return {
    props: {
      valueSetEntries: entry,
      vsacCapabilityStatement: await responses[1].json()
    }
  }
}

export default ValueSets
