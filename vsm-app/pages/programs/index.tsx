import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession, getSession, GetSessionParams } from "next-auth/react"
import { useMemo, useState, ChangeEvent } from 'react'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ButtonWrapper = styled.div`
  margin-left: 12px;
`

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Programs: NextPage = () => {
  const router = useRouter()
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')

  const session = useSession()

  const programs = useGetPrograms({
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription
  })

  const columns = useMemo(() => [
    {
      name: 'Updated',
      selector: (row: fhir4.Library) => row.date,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'ID',
      selector: (row: fhir4.Library) => row.id,
      sortable: true,
      maxWidth: '250px',
      wrap: true
    },
    {
      name: 'Name',
      selector: (row: fhir4.Library) => row.name,
      sortable: true,
      maxWidth: '300px',
      wrap: true
    },
    {
      name: 'Title',
      selector: (row: fhir4.Library) => row.title,
      sortable: true,
      maxWidth: '200px',
      wrap: true
    },
    {
      name: 'Description',
      selector: (row: fhir4.Library) => row.description,
      sortable: false,
      maxWidth: '300px',
      minWidth: '300px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: fhir4.Library) => row.version,
      sortable: true,
      wrap: true
    },
    {
      name: 'View + Edit',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            onClick={() => router.push(`/programs/${row.id}`)}
            buttonContext='edit'
          />
        </ButtonWrapper>
      )
    }
  ], [router])

  const onClick = () => {
    router.push('/programs/new')
  }
  // commenting out the ID search input
  // because cannot partial-string-search on field
  return (
    <Col>
      <PageTitle>
        Programs
      </PageTitle>
      <Row>
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermName(e.target.value)}
          id='program-search-name'
          label='Name'
          hasIcon={true}
          minWidth={400}
        />
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermTitle(e.target.value)}
          id='program-search-title'
          label='Title'
          hasIcon={true}
          minWidth={400}
        />
        <SearchInput
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setSearchTermDescription(e.target.value)
          }}
          id='program-search-description'
          label='Description'
          hasIcon={true}
          minWidth={400}
        />
        <Button style={{ marginTop: '12px' }} text='Add New Program'
          onClick={onClick}
        />
      </Row>
      <DT
        data={programs}
        // @ts-expect-error
        columns={columns}
        theme='aphl'
        pagination
        fixedHeader
        customStyles={customStyles}
      />
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default Programs
