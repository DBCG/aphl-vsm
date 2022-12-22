import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession, getSession, GetSessionParams } from 'next-auth/react'
import { useMemo, useState, ChangeEvent } from 'react'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { Button } from '@/components/buttons/Button'
import { can, VSMSession } from '@/helpers/rolesHelper'

const Col = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
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
  };
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
  display: ${props => props.error ? 'inherit' : 'none'};
`

const Programs: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession}
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [programToPublish, setProgramToPublish] = useState<fhir4.Library | null>(null)
  const [programToRelease, setProgramToRelease] = useState<fhir4.Library | null>(null)
  const [error, setError] = useState('')
  // $draft cloning
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [cloneError, setCloneError] = useState('')
  // operations
  const [selectedProgram, setSelectedProgram] = useState<fhir4.Library | null>(null)
  const [actionType, setActionType] = useState<'clone' | 'publish' | 'release' | null>(null)

  const programs = useGetPrograms({
    id: searchTermID,
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription,
    newProgram: `${router?.query?.new}`
  })

  const cloneProgram = async () => {
    setCloneLoading(true)
    setCloneError('')
    let libraryData: any = ''
    libraryData = program[0]
    const json = JSON.stringify(libraryData)

    const res = await fetch('/api/template', {
      method: 'POST',
      body: json
    })

    if (res.ok) {
      router.push(`/programs`)
    } else {
      // if response is a failure, error message
      setCloneLoading(false)
      setModalOpen(false)
      setCloneError(`Error cloning program ${programId}`)
    }
  }

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
      name: 'Clone',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      omit: !can(session, 'clone'),
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            disabled={row.status !== 'active'}
            onClick={() => {
              setActionType('clone')
              setModalOpen(true)
              setSelectedProgram(row)
            }
            }
            buttonContext='clone'
          />
        </ButtonWrapper>
      )
    },
    {
      name: 'Release',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      omit: !can(session, 'release'),
      wrap: true,
      center: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            disabled={row.status !== 'draft'}
            onClick={() => {
              setError('')
              setActionType('release')
              setSelectedProgram(row)
              // setProgramToRelease(row)
            }}
            buttonContext='release'
          />
        </ButtonWrapper>
      )
    },
  ], [router, router?.query?.new])

  const handleCancelModal = () => {
    setSelectedProgram(null)
    setActionType(null)
  }

  const handleModalAction = async (actionType: 'release' | 'publish' | 'clone', program: fhir4.Library) => {
    let result
    let endpoint

    setLoading(true)

    if (actionType === 'release' || actionType === 'publish') {
      endpoint = `/api/programs/${program.id}/${actionType}`
    } else {
      endpoint = `/api/template`
    }

    result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(program)
    })

    if (!result.ok) {
      setError(`Error occurred with ${actionType} for program: ${program.id}. Please try again.`)
    } else if (actionType === 'clone') {
      const json = await result.json()
      console.log('json: ', json)
      // router.push(`/programs/${json.id}`)
    } else {
      // this is not ideal
      router.reload()
    }

    setLoading(false)
    setSelectedProgram(null)
  }


  return (
    <Col>
      <Row>
        <PageTitle>
          Programs
        </PageTitle>
        <Button
          text='Publish'
        />
      </Row>
      <LoadingModal
        isOpen={Boolean(actionType) && Boolean(selectedProgram)}
        actionType={actionType}
        loading={loading}
        handleCancelModal={handleCancelModal}
        handleModalAction={handleModalAction}
        program={selectedProgram}
      />
      <ErrorContainer error={error}>
        <ErrorText error={error}>{ error }</ErrorText>
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
