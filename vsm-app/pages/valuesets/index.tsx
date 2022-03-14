import type { NextPage } from 'next'
import type { Bundle } from 'fhir/r4'
import styled from 'styled-components'
import { PageTitle } from '../../components/Typography'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/Button'

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
  vsacValueSet: Bundle
}

const ValueSets: NextPage<ValueSetProps> = ({ vsacValueSet }) => {
  return (
    <Col>
      <PageTitle>ValueSet Search</PageTitle>
      <Row>
        <SearchInput placeholder='Search by ID, Name, Title' />
        <Button text='Add New Program' />
        { JSON.stringify(vsacValueSet, null, 2) }
      </Row>
    </Col>
  )
}

export async function getStaticProps() {
  const { VSAC_USERNAME, VSAC_API_KEY } = process.env
  const vsacBaseUrl = 'https://cts.nlm.nih.gov/fhir'

  const headers = new Headers();
  const authString = `${VSAC_USERNAME}:${VSAC_API_KEY}`
  headers.set('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`)
  const fetchOptions = { method: 'GET', headers }

  const responses = await Promise.all([
    fetch(`${vsacBaseUrl}/ValueSet`, fetchOptions ),
    fetch(`${vsacBaseUrl}/CodeSystem`, fetchOptions)
  ])
  
  console.log(await responses[0].json())

  const vsacValueSet = {};

  return {
    props: {
      vsacValueSet
    }
  }
}

export default ValueSets
