import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import ReactModal from 'react-modal'
import { getSession, GetSessionParams } from 'next-auth/react'
import { useMemo, useState, ChangeEvent } from 'react'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'

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

export interface StatusProps {
  status: string
}

const StatusTag = styled.div<StatusProps>`
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
  },
  rows: {
    style: {
      cursor: 'pointer',
    },
    highlightOnHoverStyle: {
      backgroundColor: '#DBF0F3'
    }
  }
}

const ModalContent = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`


const Programs: NextPage = () => {
  const router = useRouter()
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [programToPublish, setProgramToPublish] = useState(null)

  const programs = useGetPrograms({
    id: searchTermID,
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription,
    newProgram: `${router?.query?.new}`
  })

  const columns = useMemo(() => [
    {
      name: 'Status',
      selector: (row: fhir4.Library) => row.status,
      sortable: true,
      maxWidth: '150px',
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => {
        return (
          <StatusTag status={row.status}>{ row.status }</StatusTag>
        )
      }
    },
    {
      name: 'Updated',
      selector: (row: fhir4.Library) => row.date,
      sortable: true,
      maxWidth: '100px',
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
      name: 'Use as Template',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => row.status === 'active' && (
        <ButtonWrapper>
          <IconButton
            onClick={() => router.push(`/programs/template?id=${row.id}`)}
            buttonContext='clone'
          />
        </ButtonWrapper>
      )
    },
    {
      name: 'Publish',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => row.status === 'draft' && (
        <ButtonWrapper>
          <IconButton
            onClick={() => setProgramToPublish(row)}
            buttonContext='clone'
          />
        </ButtonWrapper>
      )
    }
  ], [router, router?.query?.new])

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
  
  const customModalStyles = {
    overlay: {
      zIndex: 2
    }
  }

  const publishProgram = async (program) => {
    console.log('program: ', JSON.stringify(program))
    const updatedProgram = await fetch(`/api/programs/${program.id}/publish`, {
      method: 'POST',
      body: JSON.stringify(program)
    })

    console.log('updated: ', updatedProgram)
  }

  return (
    <Col>
      <PageTitle>
        Programs
      </PageTitle>
      <ReactModal
        isOpen={!!programToPublish}
        style={customModalStyles}
      >
        <ModalContent>
          <div>
            <p>Publish Program</p>
            <p>Publishing this program will mark it as active and allow others to use it as a template.</p>
            <p>Would you like to continue?</p>
            <Button
              text='Cancel'
              onClick={() => setProgramToPublish(null)}
            />
            <Button
              text='Publish'
              onClick={() => publishProgram(programToPublish)}
            />
          </div>
        </ModalContent>
      </ReactModal>
      <DT
        data={programs}
        // @ts-expect-error
        columns={columns}
        theme='aphl'
        pagination
        fixedHeader
        highlightOnHover={true}
        onRowClicked={(row) => router.push(`/programs/${row.id}`)}
        customStyles={customStyles}
        progressPending={!programs.length}
        progressComponent={<LoadingIndicator/>}
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
