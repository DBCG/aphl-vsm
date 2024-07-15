import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Tooltip } from '@mui/material'
import useSWR from 'swr'
import styled from 'styled-components'
import { debounce } from 'lodash'
import DT from 'react-data-table-component'
import { fetchWithProgram } from '@/utils'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { ReleaseModal, ReleasePayload } from '@/components/modals/ReleaseModal'
import { allowClone, allowRelease, can, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/Chips'
import { formatDateForTable } from '@/helpers/formatDates'
import { getLatestFromList } from '@/helpers/server/semverHelpers'
import TextLink from '@/components/TextLink'
import { ProgramApiResponse } from '@/pages/api/programs'

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

export interface PaginationState {
  page: number
  countPerPage: number
  searchTotal: number | null
}

const generateBlockedReason = (program: fhir4.Library, actionType: 'clone' | 'release') => {
  if (actionType === 'clone' && program.status !== 'active') {
    return 'Only Active programs may be cloned'
  } else if (actionType === 'release') {
    if (program.status !== 'draft') {
      return 'Only Draft programs may be released'
    } else if (!program.approvalDate) {
      return 'You must approve the program before releasing'
    }
  }
  return 'Action blocked'
}

const ProgramsTab: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [loading, setLoading] = useState(false)
  const [programToRelease, setProgramToRelease] = useState<fhir4.Library | null>(null)
  const [error, setError] = useState<Error>({})
  const [latestProgramVersion, setLatestProgramVersion] = useState<null | string>(null)

  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: null
  })

  // clone template
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [progIdToClone, setProgIdToClone] = useState('')

  const { data = { programs: [], assessments: [], total: 0 }, mutate } = useSWR(
    {
      url: '/api/programs',
      args: {
        list: true, // use this so on the server side we don't need to load all details of the program
        offset: pagination?.page > 1 ? (pagination?.page - 1) * pagination.countPerPage : 0,
        count: pagination?.countPerPage
      }
    },
    (args) =>
      fetchWithProgram(args).then((resp: ProgramApiResponse) => {
        if ('error' in resp) {
          setError(resp)
          return
        }
        return resp
      }),
    { revalidateOnFocus: false }
  )
  const { programs, total } = data

  useEffect(() => {
    if (total !== pagination?.searchTotal) {
      setPagination({ ...pagination, searchTotal: total })
    }
  }, [total, pagination.searchTotal, setPagination, pagination])

  useEffect(() => {
    const programList = programs?.map((p) => p.version).filter((p) => !!p) as string[]
    if (programs?.length) {
      setLatestProgramVersion(getLatestFromList(programList))
    } else {
      setLatestProgramVersion(null)
    }
  }, [programs])

  const handlePageChange = (newPage: number) => setPagination({ ...pagination, page: newPage })

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

      if (!res?.ok) {
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
    } finally {
      setPagination({ ...pagination, searchTotal: null })
      mutate()
      setModalOpen(false)
      setCloneLoading(false)
    }
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
        minWidth: '12rem',
        maxWidth: '15rem',
        wrap: true,
        cell: (row: fhir4.Library) => (
          <TextLink
          href={`/programs/${row.id}`}
          linkText={row.id}
          forceReload={false}
        />
        )
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
        name: 'Create New',
        selector: (row: fhir4.Library) => row.id || '',
        sortable: true,
        // maxWidth: '15rem',
        // minWidth: '10rem',
        wrap: true,
        cell: (row: fhir4.Library) => {
          const canClone = allowClone({ session, programStatus: row.status! })
        const blockedReason = !canClone && generateBlockedReason(row, 'clone') 
         return (
          <Tooltip title={blockedReason} arrow>
            <span>
              <Button
                size='small'
                variant='contained'
                disabled={row.status !== 'active'}
                onClick={() => {
                  handleClickClone(row.id!)
                }}
                style={{ height: 'fit-content' }}
              // buttoncontext={`clone-${program.status}`}
              >Clone</Button>

            </span>
          </Tooltip>
        )
      }
      },
      {
        name: 'Release',
        selector: (row: fhir4.Library) => row.id || '',
        sortable: true,
        // maxWidth: '15rem',
        // minWidth: '10rem',
        wrap: true,
        cell: (row: fhir4.Library) => {
        const canRelease = allowRelease({ session, programStatus: row.status!, hasApproval: Boolean(row?.approvalDate) })
         const blockedReason = !canRelease && generateBlockedReason(row, 'release') 
         return (
          <Tooltip title={blockedReason} arrow>
            <span>
              <Button
                size='small'
                variant='contained'
                style={{ height: 'fit-content' }}
                disabled={row.status !== 'draft' || !row.approvalDate}
                onClick={() => {
                  setError({})
                  setProgramToRelease(row)
                }}
              // buttoncontext={program?.approvalDate ? `release-${program.status}` : `mustApproveRelease-${program.status}`}
              >Release</Button>

            </span>
          </Tooltip>
        )
      }
      }
    ],
    [session]
  )

  const handleCancelReleaseModal = () => {
    setProgramToRelease(null)
  }

  // release payload?
  const handleReleaseModalAction = async (payload: ReleasePayload) => {
    setLoading(true)
    const endpoint = `/api/programs/${payload.programId}/release`

    const result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!result.ok) {
      const res = await result.json()
      let errorText
      if (res?.error?.includes('HAPI-0389')) {
        errorText = 'Draft program must be approved to release.'
      } else if (!!res?.error) {
        errorText = res.error
      } else {
        errorText = 'Please try again.'
      }
      setError({
        error: `Error occurred while releasing program: ${payload.programId}. ${errorText}`
      })
    } else {
      router.reload()
    }

    setLoading(false)
    setProgramToRelease(null)
  }

  if (!data) return <LoadingIndicator />

  return (
    <Col>
      {modalOpen && (
        <LoadingModal
          actionType="clone"
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
      )}
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
      </Row>
      {programToRelease && (
        <ReleaseModal
        isOpen={Boolean(programToRelease)}
        loading={loading}
        handleCancelModal={handleCancelReleaseModal}
        handleModalAction={handleReleaseModalAction}
        program={programToRelease}
        setProgramToRelease={setProgramToRelease}
      />
      )}
      <ErrorMessage error={error?.error || null} />
      <DT
        data={programs}
        columns={columns}
        theme="aphl"
        pagination
        paginationServer
        paginationTotalRows={pagination.searchTotal || 0}
        paginationPerPage={pagination.countPerPage}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={(newRowsPerPage, newPage) => setPagination({ ...pagination, page: newPage, countPerPage: newRowsPerPage })}
        fixedHeader
        highlightOnHover={true}
        progressPending={!programs?.length}
        progressComponent={<LoadingIndicator />}
      />
    </Col>
  )
}

export default ProgramsTab
