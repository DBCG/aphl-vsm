import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import debounce from 'lodash.debounce'
import DT from 'react-data-table-component'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { ReleaseModal } from '@/components/modals/ReleaseModal'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/Chips'
import { customTableStyles } from '@/components/tables/themes'
import { formatDateForTable } from '@/helpers/formatDates'
import sort from 'semver/functions/sort'
import { getLatestFromList } from '@/helpers/server/semverHelpers'

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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`

export interface StatusProps {
  status: string
  experimental: boolean
}

interface Error {
  error?: string
}

const Programs: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [loading, setLoading] = useState(false)
  const [programToPublish, setProgramToPublish] = useState<fhir4.Library | null>(null)
  const [programToRelease, setProgramToRelease] = useState<fhir4.Library | null>(null)
  const [versionToRelease, setVersionToRelease] = useState<null | string | undefined>(null)
  const [error, setError] = useState<Error>({})
  const [latestProgramVersion, setLatestProgramVersion] = useState<null | string>(null)

  // clone template
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [progIdToClone, setProgIdToClone] = useState('')
  const [newCloneExists, setNewCloneExists] = useState(false)

  const toggleNewCloneExists = () => setNewCloneExists((exists) => !exists)

  const programs = useGetPrograms({
    newProgram: `${router?.query?.new}`,
    refreshToggle: newCloneExists
  })

  useEffect(() => {
    const programList = programs?.map(p => p.version)
    if (programs.length) {
      setLatestProgramVersion(getLatestFromList(programList as string[]))
    } else {
      setLatestProgramVersion(null)
    }
  }, [programs])

  const handleClickClone = (programId: string | undefined) => {
    if (!programId) return
    setProgIdToClone(programId)
    setModalOpen(true)
  }

  const cloneProgram = async (programId: string) => {
    if (cloneLoading) return
    setCloneLoading(true)
    setError({})
    let libraryData: any = ''
    libraryData = programs.find((p) => p.id === programId)
    const json = JSON.stringify({ libraryData, latestProgramVersion })

    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        body: json
      })
      if (res?.ok) {
        setModalOpen(false)
        toggleNewCloneExists()
      } else {
        const json = (await res.json()) as { message: string } | { error: string }
        if ('error' in json) {
          setError({ error: json.error })
        } else {
          console.error(json)
          throw new Error(JSON.stringify(json))
        }
      }
    } catch (e) {
      setError({ error: `Error cloning program ${programId}` })
    }

    setModalOpen(false)
    setCloneLoading(false)
  }

  const debouncedCloneProgram = debounce((programId) => cloneProgram(programId), 2000, { leading: true, trailing: false })

  const columns = useMemo(
    () => [
      {
        name: 'Status',
        selector: (row: fhir4.Library) => row.status,
        sortable: true,
        maxWidth: '8rem',
        wrap: true,
        center: true,
        cell: (row: fhir4.Library) => {
          const experimental = Boolean(row.experimental)
          return (
            <Container>
              <StatusChip experimental={experimental} style={{ justifySelf: 'center' }} label={row.status} />
            </Container>
          )
        }
      },
      {
        name: 'ID',
        selector: (row: fhir4.Library) => row.id || '',
        sortable: true,
        maxWidth: '8rem',
        wrap: true
      },
      {
        name: 'Title',
        selector: (row: fhir4.Library) => row.title || '',
        sortable: true,
        maxWidth: '15rem',
        minWidth: '10rem',
        wrap: true
      },
      {
        name: 'Version',
        selector: (row: fhir4.Library) => row.version || '',
        sortable: true,
        wrap: true,
        maxWidth: '8rem'
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.Library) => {
          const formattedDate = formatDateForTable(row?.meta?.lastUpdated, 'm/d/yyyy')
          return formattedDate
        },
        sortable: true,
        wrap: true,
        maxWidth: '8rem'
      },
      {
        name: 'Description',
        selector: (row: fhir4.Library) => row.description || '',
        sortable: false,
        wrap: true,
        minWidth: '20rem'
      },
      {
        name: 'Steward',
        selector: (row: fhir4.Library) => row.publisher || '',
        sortable: true,
        maxWidth: '15rem',
        minWidth: '10rem',
        wrap: true
      },
      {
        name: 'Clone',
        selector: (row: fhir4.Library) => row.name || '',
        sortable: false,
        omit: !can(session, 'clone'),
        wrap: true,
        center: true,
        maxWidth: '3rem',
        cell: (row: fhir4.Library) => (
          <ButtonWrapper>
            <IconButton
              disabled={row.status !== 'active'}
              onClick={() => {
                handleClickClone(row.id)
              }}
              buttoncontext={`clone-${row.status}`}
            />
          </ButtonWrapper>
        )
      },
      {
        name: 'Release',
        selector: (row: fhir4.Library) => row.name || '',
        sortable: false,
        omit: !can(session, 'release'),
        wrap: true,
        center: true,
        maxWidth: '3rem',
        cell: (row: fhir4.Library) => (
          <ButtonWrapper>
            <IconButton
              disabled={row.status !== 'draft' || !row.approvalDate}
              onClick={() => {
                setError({})
                setProgramToRelease(row)
              }}
              buttoncontext={programToPublish?.approvalDate ? `release-${row.status}` : `mustApproveRelease-${row.status}`}
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
    setVersionToRelease(null)
  }

  const handleModalAction = async (actionType: 'release' | 'publish', program: fhir4.Library) => {
    let result
    let endpoint
    let reqBody
    setLoading(true)

    if (actionType === 'release') {
      endpoint = `/api/programs/${program.id}/release`
      reqBody = {
        releaseAsVersion: versionToRelease,
        program
      }
    } else {
      endpoint = `/api/programs/${program.id}/publish`
      reqBody = program
    }

    result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(reqBody)
    })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: `Error occurred while ${actionType === 'release' ? 'releasing' : 'publishing'} program: ${program.id}. ${
          res?.error?.includes('HAPI-0389') ? 'Draft program must be approved to release.' : 'Please try again.'
        }`
      })
    } else {
      router.reload()
    }

    setLoading(false)
    setProgramToPublish(null)
    setProgramToRelease(null)
    setVersionToRelease(null)
  }

  return (
    <Col>
      <LoadingModal
        actionType="clone"
        latestVersion=""
        isOpen={modalOpen}
        handleModalAction={async () => {
          // throttle this action based on if it is already ongoing
          if (cloneLoading) return
          debouncedCloneProgram(progIdToClone)
        }}
        program={null}
        loading={cloneLoading}
        handleCancelModal={() => setModalOpen(false)}
      />
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Programs</PageTitle>
      </Row>
      <ReleaseModal
        isOpen={Boolean(programToRelease)}
        loading={loading}
        handleCancelModal={handleCancelModal}
        handleModalAction={handleModalAction}
        program={programToRelease}
        updateVersion={setVersionToRelease}
        setProgramToRelease={setProgramToRelease}
      />
      <LoadingModal
        isOpen={Boolean(programToPublish)}
        actionType={programToRelease ? 'release' : 'publish'}
        loading={loading}
        handleCancelModal={handleCancelModal}
        handleModalAction={handleModalAction}
        program={programToPublish || programToRelease}
        updateVersion={setVersionToRelease}
      />
      <ErrorMessage error={error?.error || null} />
      <DT
        data={programs}
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
