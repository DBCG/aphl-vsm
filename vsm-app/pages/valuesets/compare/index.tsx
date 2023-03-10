import type { NextPage } from 'next'
import styled from 'styled-components'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import { getSession, GetSessionParams } from 'next-auth/react'

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

const ValueSetCompare: NextPage = () => {
  return (
    <Col>
      <PageTitle>ValueSet Compare</PageTitle>
      <Row>
        <SearchInput placeholder="Search by ID, Name, Title" />
        <Button onClick={(e: React.MouseEvent) => console.log(e)} text="Add New Program" />
      </Row>
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false
      }
    }
  }

  return {
    props: { session }
  }
}

export default ValueSetCompare
