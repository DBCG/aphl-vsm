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

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(200, 200, 200, 0.5);
  backdrop-filter: blur(10px);

`

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

const ModalTitle = styled.h1`
  margin-bottom: 36px;
`

const ModalText = styled.p`
  max-width: 400px;
  line-height: 140%;
  margin: 0 auto;
  margin-bottom: 12px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 36px;
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
`

interface ErrorProp {
  error: string
}

const ErrorContainer = styled.div<ErrorProp>`
  max-height: ${props => props.error ? '500px' : '0'};
  background-color: white;
  transition: max-height 1s ease;
  padding-left: 18px;
  border: ${props => props.error ? '1px solid var(--accent)' : 'none'}; 

`

const ErrorText = styled.p<ErrorProp>`
  color: var(--accent);
  display: ${props => props.error ? 'inherit' : 'none'}
`

const Programs: NextPage = () => {
  const router = useRouter()
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')
  const [publishLoading, setPublishLoading] = useState(false)
  const [programToPublish, setProgramToPublish] = useState<fhir4.Library | null>(null)
  const [publishError, setPublishError] = useState('')

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
            onClick={() => {
              setPublishError('')
              setProgramToPublish(row)
            }}
            buttonContext='publish'
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
      zIndex: 2,
    },
    content: {
      maxWidth: '500px',
      margin: '0 auto'
    }
  }

  const publishProgram = async (program: fhir4.Library) => {
    setPublishLoading(true)
    const result = await fetch(`/api/programs/${program.id}/publish`, {
      method: 'POST',
      body: JSON.stringify(program)
    })

    if (!result.ok) {
      setPublishError(`Error occurred while publishing program: ${program.id}. Please try again.`)
    } else {
      router.reload()
    }
    
    setPublishLoading(false)
    setProgramToPublish(null)
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
            <ModalTitle>Publish Program</ModalTitle>
            <ModalText>Publishing this program will mark it as active and allow others to use it as a template.</ModalText>
            <ModalText>Would you like to continue?</ModalText>
            <ButtonGroup>
              <Button
                text='Cancel'
                onClick={() => setProgramToPublish(null)}
                style={{ backgroundColor: 'var(--neutral-300)' }}
                />
              <Button
                text='YES - Publish'
                onClick={() => publishProgram(programToPublish as fhir4.Library)}
                />
            </ButtonGroup>
            {
              publishLoading &&
              <ModalOverlay>
                  <LoadingContainer>
                    <ModalText>Publishing may take up to a minute.<br/>Please keep this window open until it completes.</ModalText>
                    <LoadingIndicator size='large' />
                  </LoadingContainer>
              </ModalOverlay>
            }
          </div>
        </ModalContent>
      </ReactModal>
      <ErrorContainer error={publishError}>
        <ErrorText error={publishError}>{ publishError }</ErrorText>
      </ErrorContainer>
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
