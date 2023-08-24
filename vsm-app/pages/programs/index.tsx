import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { Button } from '@/components/buttons/Button'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/StatusChip'
import { customTableStyles } from '@/components/tables/themes'
import { formatDateForTable } from '@/helpers/formatDates'

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

interface Error {
  message?: string
}

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px',
      fontFamily: 'Roboto',
      fontSize: '120%'
    }
  },
  headCells: {
    style: {
      fontFamily: 'Roboto'
    }
  },
  rows: {
    style: {
      cursor: 'pointer'
    },
    highlightOnHoverStyle: {
      backgroundColor: '#DBF0F3'
    }
  }
}

const Programs: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [searchTermID, setSearchTermID] = useState('')
  const [searchTermName, setSearchTermName] = useState('')
  const [searchTermTitle, setSearchTermTitle] = useState('')
  const [searchTermDescription, setSearchTermDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [programToPublish, setProgramToPublish] = useState<fhir4.Library | null>(null)
  const [programToRelease, setProgramToRelease] = useState<fhir4.Library | null>(null)
  const [error, setError] = useState<Error>({})

  // clone template
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [progIdToClone, setProgIdToClone] = useState('')
  const [newCloneExists, setNewCloneExists] = useState(false)

  const toggleNewCloneExists = () => setNewCloneExists((exists) => !exists)

  const programs = useGetPrograms({
    id: searchTermID,
    name: searchTermName,
    title: searchTermTitle,
    description: searchTermDescription,
    newProgram: `${router?.query?.new}`,
    refreshToggle: newCloneExists
  })

  const handleClickClone = (programId: string | undefined) => {
    if (!programId) return
    setProgIdToClone(programId)
    setModalOpen(true)
  }

  const cloneProgram = async (programId: string) => {
    setCloneLoading(true)
    setError({})
    let libraryData: any = ''
    libraryData = programs.find((p) => p.id === programId)
    const json = JSON.stringify(libraryData)

    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        body: json
      })

      if (res?.ok) {
        setModalOpen(false)
        toggleNewCloneExists()
      } else {
        const json = await res.json()
        setError({ message: json.message })
      }
    } catch (e) {
      setError({ message: `Error cloning program ${programId}` })
    }

    setCloneLoading(false)
    setModalOpen(false)
  }

  const columns = useMemo(
    () => [
      {
        name: 'Status',
        selector: (row: fhir4.Library) => row.status,
        sortable: true,
        maxWidth: '150px',
        wrap: true,
        center: true,
        cell: (row: fhir4.Library) => {
          return <StatusChip label={row.status} />
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
        name: 'Steward',
        selector: (row: fhir4.Library) => row.publisher,
        sortable: true,
        maxWidth: '200px',
        wrap: true
      },
      {
        name: 'Version',
        selector: (row: fhir4.Library) => row.version,
        sortable: true,
        wrap: true
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.Library) => {
          const formattedDate = formatDateForTable(row?.meta?.lastUpdated, 'm/d/yyyy')
          return formattedDate
        },
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
            <IconButton disabled={row.status !== 'active'} onClick={() => handleClickClone(row.id)} buttonContext={`clone-${row.status}`} />
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
              disabled={row.status !== 'draft' || !row.approvalDate}
              onClick={() => {
                setError({})
                setProgramToRelease(row)
              }}
              buttonContext={programToPublish?.approvalDate ? `release-${row.status}` : `mustApproveRelease-${row.status}`}
            />
          </ButtonWrapper>
        )
      }
    ],
    [session]
  )

  const handleCancelModal = () => {
    setProgramToPublish(null)
    setProgramToRelease(null)
  }

  const handleModalAction = async (actionType: 'release' | 'publish', program: fhir4.Library) => {
    let result
    let endpoint
    setLoading(true)

    if (actionType === 'release') {
      endpoint = `/api/programs/${program.id}/release`
    } else {
      endpoint = `/api/programs/${program.id}/publish`
    }

    result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(program)
    })

    if (!result.ok) {
      const res = await result.json()
      setError({
        message: `Error occurred while ${actionType === 'release' ? 'releasing' : 'publishing'} program: ${program.id}. ${
          res?.error?.includes('HAPI-0389') ? 'Draft program must be approved to release.' : 'Please try again.'
        }`
      })
    } else {
      router.reload()
    }

    setLoading(false)
    setProgramToPublish(null)
    setProgramToRelease(null)
  }

  return (
    <Col>
      <LoadingModal
        actionType="clone"
        isOpen={modalOpen}
        handleModalAction={async () => cloneProgram(progIdToClone)}
        program={null}
        loading={cloneLoading}
        handleCancelModal={() => setModalOpen(false)}
      />
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Programs</PageTitle>
        {/* <Button text="Publish" /> */}
      </Row>
      <LoadingModal
        isOpen={Boolean(programToRelease) || Boolean(programToPublish)}
        actionType={programToRelease ? 'release' : 'publish'}
        loading={loading}
        handleCancelModal={handleCancelModal}
        handleModalAction={handleModalAction}
        program={programToPublish || programToRelease}
      />
      <ErrorMessage error={error?.message || null} />
      <DT
        data={programs}
        // @ts-expect-error
        columns={columns}
        theme="aphl"
        pagination
        fixedHeader
        highlightOnHover={true}
        onRowClicked={(row) => router.push(`/programs/${row.id}`)}
        customStyles={customTableStyles('clickable')}
        progressPending={!programs.length}
        progressComponent={<LoadingIndicator />}
      />
    </Col>
  )
}

export default Programs
