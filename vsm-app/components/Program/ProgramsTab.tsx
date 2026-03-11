import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormControlLabel, FormGroup, Modal, Switch, Tooltip } from '@mui/material'
import CallMadeIcon from '@mui/icons-material/CallMade'
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown'
import useSWR from 'swr'
import styled from 'styled-components'
import { debounce } from 'lodash'
import DT from 'react-data-table-component'
import { fetchWithProgram } from '@/utils'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { ReleaseModal, ReleasePayload } from '@/components/modals/ReleaseModal'
import { allowClone, allowRelease, allowWithdraw, allowRetire, allowDelete, can, isAdmin, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/Chips'
import { formatDateForTable } from '@/helpers/formatDates'
import { getLatestFromList } from '@/helpers/server/semverHelpers'
import TextLink from '@/components/TextLink'
import { ProgramApiResponse } from '@/pages/api/programs'
import { toast } from 'react-toastify'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import { isReleaseInProgress } from '@/helpers/libraryHelpers'
import CircularProgress from '@mui/material/CircularProgress'
import { apiFetch } from '@/utils'

export const checkboxStyles = {
  root: {
    color: 'inherit'
  }
}

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
  error?: string | string[]
}

export interface PaginationState {
  page: number
  countPerPage: number
  searchTotal: number | null
}

const generateBlockedReason = (program: fhir4.Library, actionType: 'clone' | 'release' | 'withdraw' | 'retire' | 'delete') => {
  if (actionType === 'clone' && program.status !== 'active') {
    return 'Only Active (released) programs may be cloned'
  } else if (actionType === 'release') {
    if (program.status !== 'draft') {
      return 'Only Draft programs may be released'
    } else if (!program.approvalDate) {
      return 'You must approve the program before releasing'
    }
  } else if (actionType === 'withdraw' && program.status !== 'draft') {
    return 'Only Draft programs may be withdrawn'
  } else if (actionType === 'retire' && program.status !== 'active') {
    return 'Only Active programs may be retired'
  } else if (actionType === 'delete' && program.status !== 'retired') {
    return 'Only Retired programs may be deleted'
  }
  return 'Action blocked'
}

interface ExpandableRowProps {
  data: fhir4.Library
  session: VSMSession
  handleClickClone: (programId: string) => void
  setProgramToRelease: (program: fhir4.Library | null) => void
  handleClickWithdraw: (programId: string | undefined) => void
  handleClickRetire: (programId: string | undefined) => void
  handleClickDelete: (programId: string | undefined) => void
  setError: (error: Error) => void
}

const ExpandableRowComponent = ({
  data: row,
  session,
  handleClickClone,
  setProgramToRelease,
  handleClickWithdraw,
  handleClickRetire,
  handleClickDelete,
  setError
}: ExpandableRowProps) => {
  const canClone = allowClone({ session, program: row })
  const cloneBlockedReason = !canClone && generateBlockedReason(row, 'clone')
  const defaultCloneDescription = 'Cloning an active program will create a draft copy that you can edit'

  const canRelease = allowRelease({ session, program: row, hasApproval: Boolean(row?.approvalDate) })
  const releaseBlockedReason = !canRelease && generateBlockedReason(row, 'release')
  const defaultReleaseDescription = 'Releasing a program will mark it as active, and it will no longer be editable in VSM'

  const canWithdraw = allowWithdraw({ session, program: row })
  const withdrawBlockedReason = !canWithdraw && generateBlockedReason(row, 'withdraw')
  const defaultWithdrawDescription = 'Withdrawing a draft program will delete it from VSM permanently'

  const canRetire = allowRetire({ session, program: row })
  const retireBlockedReason = !canRetire && generateBlockedReason(row, 'retire')
  const defaultRetireDescription = 'Retiring an active program will retire it from VSM'

  const canDelete = allowDelete({ session, program: row })
  const deleteBlockedReason = !canDelete && generateBlockedReason(row, 'delete')
  const defaultDeleteDescription = 'Deleting a retired program will delete it from VSM permanently'

  const isReleasing = isReleaseInProgress(row)
  return (
    <div style={{ padding: '1rem', marginLeft: '48px' }}>
      <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center', paddingBottom: '2rem' }}>
        <p style={{ display: 'inline-block', marginRight: '.4rem', fontSize: '90%' }}>Actions for Program {row.id}:</p>
        {can(session, 'clone') && (
          <Tooltip title={cloneBlockedReason || defaultCloneDescription} arrow>
            {/* these spans are necessary to get the tooltips to show up consistently */}
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                data-button-context="clone-active"
                variant="contained"
                disabled={row.status !== 'active'}
                onClick={() => {
                  handleClickClone(row.id!)
                }}
                style={{ height: 'fit-content' }}
              >
                Clone
              </Button>
            </span>
          </Tooltip>
        )}
        {can(session, 'release') && (
          <Tooltip title={releaseBlockedReason || defaultReleaseDescription} arrow>
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                data-button-context={`release-${row.status}`}
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'draft' || !row.approvalDate || isReleasing}
                onClick={() => {
                  setError({})
                  setProgramToRelease(row)
                }}
              >
                Release
              </Button>
            </span>
          </Tooltip>
        )}
        {can(session, 'withdraw') && (
          <Tooltip title={withdrawBlockedReason || defaultWithdrawDescription} arrow>
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                data-button-context={`release-${row.status}`}
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'draft' || isReleasing}
                onClick={() => {
                  setError({})
                  handleClickWithdraw(row?.id)
                }}
              >
                Withdraw
              </Button>
            </span>
          </Tooltip>
        )}
        {can(session, 'retire') && (
          <Tooltip title={retireBlockedReason || defaultRetireDescription} arrow>
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                data-button-context={`retire-${row.status}`}
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'active'}
                onClick={() => {
                  setError({})
                  handleClickRetire(row?.id)
                }}
              >
                Retire
              </Button>
            </span>
          </Tooltip>
        )}
        {can(session, 'delete') && (
          <Tooltip title={deleteBlockedReason || defaultDeleteDescription} arrow>
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                data-button-context={`delete-${row.status}`}
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'retired'}
                onClick={() => {
                  setError({})
                  handleClickDelete(row?.id)
                }}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

const ToggleComponent = ({ handleToggleRetiredSwitch, programsExist, showRetired }: any) => {
  if (!programsExist) return null
  return (
    <FormGroup style={{ width: '100%', alignSelf: 'flex-start', marginTop: '1rem' }}>
      <FormControlLabel
        style={{ color: 'var(--theme-500)' }}
        control={<Switch onChange={handleToggleRetiredSwitch} />}
        label="Show retired programs"
        checked={showRetired}
      />
    </FormGroup>
  )
}

const ProgramsTab: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [loading, setLoading] = useState(false)
  const [programToRelease, setProgramToRelease] = useState<fhir4.Library | null>(null)
  const [error, setError] = useState<Error>({})
  const [latestProgramVersion, setLatestProgramVersion] = useState<null | string>(null)

  // clear rows
  const [toggledClearRows, setToggledClearRows] = useState(false)

  // withdraw state
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [progIdToWithdraw, setProgIdToWithdraw] = useState('')

  // retire state
  const [retireLoading, setRetireLoading] = useState(false)
  const [retireModalOpen, setRetireModalOpen] = useState(false)
  const [progIdToRetire, setProgIdToRetire] = useState('')

  // delete state
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [progIdToDelete, setProgIdToDelete] = useState('')

  // expandable rows
  const [refreshkey, setRefreshKey] = useState(0)

  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: null
  })

  const handleEndWithdrawAction = () => {
    setProgIdToWithdraw('')
    setWithdrawLoading(false)
    setWithdrawModalOpen(false)
  }

  const handleWithdrawDraft = async ({ id }: { id: string }) => {
    setWithdrawLoading(true)

    // withdraw will fail unless you pass it an empty parameters object
    const withdrawParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(withdrawParameters)

    // mock withdraw until the operation exists
    const result = await apiFetch(`/api/programs/${id}/withdraw`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while withdrawing program: ${id}.`, `${res.error}`]
      })
    } else {
      await mutate()
      toast.success(`Program ${id} withdrawn and deleted from VSM.`)
    }
    handleEndWithdrawAction()
    closeRows()
  }

  const handleEndRetireAction = () => {
    setProgIdToRetire('')
    setRetireLoading(false)
    setRetireModalOpen(false)
  }

  const handleRetireDraft = async ({ id }: { id: string }) => {
    setRetireLoading(true)

    // Retire will fail unless you pass it an empty parameters object
    const retireParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(retireParameters)

    // mock retire until the operation exists
    const result = await apiFetch(`/api/programs/${id}/retire`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while retiring program: ${id}.`, `${res.error}`]
      })
    } else {
      toast.success(`Program ${id} retired from VSM.`)
      mutate()
    }
    handleEndRetireAction()
    closeRows()
  }

  const handleEndDeleteAction = () => {
    setProgIdToDelete('')
    setDeleteLoading(false)
    setDeleteModalOpen(false)
  }

  const handleDeleteRetired = async ({ id }: { id: string }) => {
    setDeleteLoading(true)

    // delete will fail unless you pass it an empty parameters object
    const deleteParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(deleteParameters)

    const result = await apiFetch(`/api/programs/${id}/delete`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while deleting program: ${id}.`, `${res.error}`]
      })
    } else {
      await mutate()
      toast.success(`Program ${id} deleted from VSM.`)
    }
    handleEndDeleteAction()
    closeRows()
  }

  // clone template
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [progIdToClone, setProgIdToClone] = useState('')

  // compare programs
  const [enableCompare, setEnableCompare] = useState(false)
  const [selectedRows, setSelectedRows] = useState<fhir4.Library[] | null>(null)

  // show/hide retired programs
  const [showRetired, setShowRetired] = useState(false)

  const handleRowSelected = useCallback((state: any) => {
    setSelectedRows(() => state.selectedRows)
  }, [])

  const {
    data = { programs: [], assessments: [], total: 0 },
    isLoading,
    mutate
  } = useSWR(
    {
      url: '/api/programs',
      args: {
        list: true, // use this so on the server side we don't need to load all details of the program
        showRetired,
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
      })
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

  const handleClickWithdraw = (programId: string | undefined) => {
    if (!programId) return
    setProgIdToWithdraw(programId)
    setWithdrawModalOpen(true)
  }

  const handleClickRetire = (programId: string | undefined) => {
    if (!programId) return
    setProgIdToRetire(programId)
    setRetireModalOpen(true)
  }

  const handleClickDelete = (programId: string | undefined) => {
    if (!programId) return
    setProgIdToDelete(programId)
    setDeleteModalOpen(true)
  }

  const cloneProgram = async (programId: string) => {
    if (cloneLoading) return
    setCloneLoading(true)
    setError({})
    const json = JSON.stringify({ programId, latestProgramVersion })

    try {
      const res = await apiFetch('/api/programs/clone', {
        method: 'POST',
        body: json
      })

      if (!res?.ok) {
        const json = (await res.json()) as { message: string } | { error: string }
        if ('error' in json) {
          setError({ error: json.error })
        } else {
          throw new Error(JSON.stringify(json))
        }
      }
    } catch (e) {
      setError({ error: `Error cloning program ${programId}` })
    } finally {
      setPagination({ ...pagination, searchTotal: null })
      await mutate()
      toast.success(`Program cloned successfully.`)
      setModalOpen(false)
      setCloneLoading(false)
      closeRows()
    }
  }

  const debouncedCloneProgram = debounce((programId) => cloneProgram(programId), 2000, { leading: true, trailing: false })
  const debouncedWithdrawProgram = debounce((programId) => handleWithdrawDraft({ id: programId }), 2000, { leading: true, trailing: false })
  const debouncedRetireProgram = debounce((programId) => handleRetireDraft({ id: programId }), 2000, { leading: true, trailing: false })
  const debouncedDeleteProgram = debounce((programId) => handleDeleteRetired({ id: programId }), 2000, { leading: true, trailing: false })

  const columns = useMemo(
    () => [
      {
        name: 'Comparison',
        omit: !selectedRows?.length,
        cell: (row: fhir4.Library) => {
          const match = selectedRows?.find((r) => r.id == row.id)
          if (match && selectedRows?.length == 1) {
            return <p>Base</p>
          } else if (match && selectedRows?.length == 2 && selectedRows[0].id == row.id) {
            return <p>Target</p>
          } else if (match && selectedRows?.length == 2 && selectedRows[1].id == row.id) {
            return <p>Base</p>
          }
        }
      },
      {
        name: 'Status',
        selector: (row: fhir4.Library) => row.status,
        sortable: true,
        maxWidth: '8rem',
        wrap: true,
        center: true,
        cell: (row: fhir4.Library) => {
          const experimental = Boolean(row.experimental)
          if (isReleaseInProgress(row)) {
            return (
              <Container>
                <CircularProgress />
              </Container>
            )
          }
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
        cell: (row: fhir4.Library) => <TextLink href={`/programs/${row.id}`} linkText={row.id} forceReload={false} />
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
        name: <p>Last Updated</p>,
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
        sortable: false,
        maxWidth: '15rem',
        minWidth: '10rem',
        wrap: true
      }
    ],
    [session, selectedRows]
  )

  const handleCancelReleaseModal = () => {
    setProgramToRelease(null)
  }

  const handleCancelWithdrawModal = () => {
    setProgIdToWithdraw('')
    setWithdrawModalOpen(false)
  }

  const handleCancelRetireModal = () => {
    setProgIdToRetire('')
    setRetireModalOpen(false)
  }

  const handleCancelDeleteModal = () => {
    setProgIdToDelete('')
    setDeleteModalOpen(false)
  }

  const handleToggleRetiredSwitch = (e: any) => {
    setShowRetired(e?.target?.checked || false)
  }

  // release payload?
  const handleReleaseModalAction = async (payload: ReleasePayload) => {
    setLoading(true)
    const endpoint = `/api/programs/${payload.programId}/release`

    const result = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    const res = await result.json()

    if (!result.ok) {
      let errorText
      if (res?.error?.includes('HAPI-0389')) {
        errorText = 'Draft program must be approved to release.'
      } else if (!!res?.error) {
        errorText = res.error
      } else {
        errorText = 'Please try again.'
      }
      setError({
        error: [`Error occurred while releasing program: ${payload.programId}.`, `${errorText}`]
      })
    } else {
      NotificationStore.addJob({
        jobId: res.id,
        jobType: JOB_TYPE.RELEASE,
        metadata: {
          programId: payload.programId,
          programTitle: payload.programTitle,
          latestFromTxServer: payload.latestFromTxServer
        }
      })
      await mutate()
      toast.success(`Program ${payload.programTitle} release in progress.`)
    }

    setLoading(false)
    setProgramToRelease(null)
    closeRows()
  }

  if (!data) return <LoadingIndicator />

  const closeRows = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const [openFileInput, setOpenFileInput] = useState(false);

  const handleOpenFileInput = async () => {
    setOpenFileInput(true)
  }
  const handleCloseFileInput = () => {
    setInputFile(null)
    setOpenFileInput(false);
  };

  const [inputFile, setInputFile] = useState<File|null>(null)

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
      {withdrawModalOpen && (
        <LoadingModal
          actionType="withdraw"
          isOpen={withdrawModalOpen}
          handleModalAction={async () => {
            // throttle this action based on if it is already ongoing
            if (withdrawLoading) return
            debouncedWithdrawProgram(progIdToWithdraw)
          }}
          program={null}
          loading={withdrawLoading}
          handleCancelModal={() => handleCancelWithdrawModal()}
        />
      )}
      {retireModalOpen && (
        <LoadingModal
          actionType="retire"
          isOpen={retireModalOpen}
          handleModalAction={async () => {
            // throttle this action based on if it is already ongoing
            if (retireLoading) return
            debouncedRetireProgram(progIdToRetire)
          }}
          program={null}
          loading={retireLoading}
          handleCancelModal={() => handleCancelRetireModal()}
        />
      )}
      {deleteModalOpen && (
        <LoadingModal
          actionType="delete"
          isOpen={deleteModalOpen}
          handleModalAction={async () => {
            // throttle this action based on if it is already ongoing
            if (deleteLoading) return
            debouncedDeleteProgram(progIdToDelete)
          }}
          program={null}
          loading={deleteLoading}
          handleCancelModal={() => handleCancelDeleteModal()}
        />
      )}
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}></Row>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
        {can(session, 'clone') ? (
          <div
            style={{
              color: 'var(--theme-500)',
              alignSelf: 'flex-end',
              backgroundColor: 'white',
              padding: '1rem 1.2rem',
              borderRadius: '8px',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <ArrowCircleDownIcon />
            Expand a row to view Program Actions
          </div>
        ) : (
          <></>
        )}
        {programs?.length > 1 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '1rem',
              backgroundColor: enableCompare ? 'white' : 'transparent',
              padding: '.8rem .6rem',
              width: 'fit-content',
              alignSelf: 'flex-end'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexGrow: '1', columnGap: '.4rem' }}>
              <Button
                style={{
                  width: 'fit-content',
                  height: 'fit-content',
                  color: enableCompare && selectedRows?.length !== 2 ? 'var(--theme-400)' : 'white',
                  backgroundColor: enableCompare && selectedRows?.length !== 2 ? 'transparent' : 'var(--theme-400)',
                  transition: 'background-color 200ms linear'
                }}
                endIcon={enableCompare && selectedRows?.length == 2 ? <CallMadeIcon /> : null}
                variant="text"
                disabled={loading || (enableCompare && selectedRows?.length !== 2)}
                onClick={() => {
                  if (selectedRows && selectedRows?.length > 1) {
                    setLoading(true)
                    router.push(`programs/compare?old=${selectedRows[1].id}&new=${selectedRows[0].id}`)
                  } else {
                    setEnableCompare(true)
                  }
                }}
              >
                {selectedRows && selectedRows?.length > 1 ? 'Compare' : 'Select 2 Programs to Compare'}
              </Button>
              {enableCompare ? (
                <Button
                  style={{ width: 'fit-content', height: 'fit-content', backgroundColor: 'gray', color: 'white' }}
                  onClick={() => {
                    setSelectedRows(null)
                    setToggledClearRows((prev) => !prev)
                    setEnableCompare(false)
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <ErrorMessage error={error?.error || null} handleClose={() => setError({})} />

      <DT
        subHeader={Boolean(programs?.length) || undefined}
        subHeaderComponent={
          <ToggleComponent
            programsExist={Boolean(programs?.length)}
            handleToggleRetiredSwitch={handleToggleRetiredSwitch}
            showRetired={showRetired}
          />
        }
        className="programs-tab-table"
        key={refreshkey}
        data={programs}
        clearSelectedRows={toggledClearRows}
        columns={columns}
        theme="aphl"
        pagination
        paginationServer
        paginationTotalRows={pagination.searchTotal || 0}
        paginationPerPage={pagination.countPerPage}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={(newRowsPerPage, newPage) => setPagination({ ...pagination, page: newPage, countPerPage: newRowsPerPage })}
        progressPending={isLoading}
        progressComponent={<LoadingIndicator />}
        onSelectedRowsChange={handleRowSelected}
        selectableRows={enableCompare}
        selectableRowsNoSelectAll
        selectableRowDisabled={(row) => {
          return Boolean(selectedRows && selectedRows?.length == 2 && !selectedRows?.find((r) => r?.id == row.id))
        }}
        expandableRows={can(session, 'clone')}
        // @ts-ignore
        expandableRowsComponent={ExpandableRowComponent}
        expandableRowsComponentProps={{
          session,
          handleClickClone,
          setProgramToRelease,
          handleClickWithdraw,
          handleClickRetire,
          handleClickDelete,
          setError
        }}
      />
    </Col>
  )
}

export default ProgramsTab
