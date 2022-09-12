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
  justify-content: space-evenly;
  margin-bottom: 15px;
  flex-wrap: wrap;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
`

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`

const StatusTag = styled.div`
  padding: 4px 6px;
  border-radius: 4px;
  background-color: ${
    props => props.status === 'active'
    ? 'rgba(46, 192, 205, 0.3)'
    : 'rgba(252, 186, 3, 0.3)'
  }
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
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')

  const session = useSession()

  const programs = useGetPrograms({
    id: searchTermID,
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription
  })

  const columns = useMemo(() => [
    {
      name: 'Status',
      selector: (row: fhir4.Library) => row.status,
      sortable: true,
      maxWidth: '150px',
      wrap: true,
      center: true,
      cell: (row) => {
        return (
          <StatusTag status={row.status}>{ row.status }</StatusTag>
        )
      }
    },
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
      center: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            onClick={() => router.push(`/programs/${row.id}`)}
            buttonContext='edit'
          />
        </ButtonWrapper>
      )
    },
    {
      name: 'Use as Template',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            onClick={() => router.push(`/programs/template?id=${row.id}`)}
            buttonContext='edit'
          />
        </ButtonWrapper>
      )
    }
  ], [router])

  const onClickDownload = () => {
    router.push('/programs/download')
  }

  const onClickNewVersion = () => {
    router.push('/programs/template')
  }

  const onClickSearch = () => {
    router.push('/api/programs')
  }

  const onClickValueSet = () => {
    router.push('/programs/valueset')
  }

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
          <Col>
           <Row>
             <SearchInput
               onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermID(e.target.value)}
               id='program-search-id'
               label='ID'
               hasIcon={true}
               style={{ paddingTop: '15px' }}      
             />
           </Row>
           <Row>
             <SearchInput
               onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermName(e.target.value)}
               id='program-search-name'
               label='Name'
               hasIcon={true}
               style={{ paddingTop: '15px' }}        
             />
           </Row>
         </Col>
         <Col>
           <Row>
             <SearchInput
               onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermTitle(e.target.value)}
               id='program-search-title'
               label='Title'
               hasIcon={true}
               minWidth={500}
               style={{ paddingTop: '15px' }}
             />
           </Row>
         </Col>
         <Col> 
          <Row>
           <SearchInput
             onChange={(e: ChangeEvent<HTMLInputElement>) => {setSearchTermDescription(e.target.value)}}
             id='program-search-description'
             label='Description'
             hasIcon={true}
             minWidth={300}
             style={{ height: '140px' }}
           />
          </Row>   
         </Col>
         <Col>
           <Row>
             <Button style={{ marginTop: '1px', width:'160px' }} text='Search'
               onClick={onClickSearch}
             />
           </Row>
           <Row>
             <Button style={{ marginTop: '1px', width:'160px' }} text='Download'
               onClick={onClickDownload}
             />
           </Row>
           <Row>    
             <Button style={{ marginTop: '1px', width:'160px'}} text='+Value Set'
               onClick={onClickValueSet}
             />
           </Row>
           <Row>
             <Button style={{ marginTop: '1px', width:'160px'}} text='Add New Program'
               onClick={onClick}
             />
           </Row>
         </Col>  
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
