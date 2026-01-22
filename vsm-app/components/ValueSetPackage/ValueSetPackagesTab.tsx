import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormControlLabel, FormGroup, Switch, Tooltip, TextField, Autocomplete } from '@mui/material'
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown'
import useSWR from 'swr'
import styled from 'styled-components'
import { debounce } from 'lodash'
import DT from 'react-data-table-component'
import { fetchWithProgram } from '@/utils'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { allowRelease, allowWithdraw, allowRetire, allowDelete, can, isAdmin, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/Chips'
import { formatDateForTable } from '@/helpers/formatDates'
import TextLink from '@/components/TextLink'
import { VSPApiResponse } from '@/types/vspTypes'
import { toast } from 'react-toastify'
import { CreateVSPModal } from '@/components/modals/CreateVSPModal'
import { CreateVSPRequest } from '@/types/vspTypes'

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

interface Error {
  error?: string | string[]
}

export interface PaginationState {
  page: number
  countPerPage: number
  searchTotal: number | null
}

const generateBlockedReason = (vsp: fhir4.Library, actionType: 'release' | 'withdraw' | 'retire' | 'delete') => {
  if (actionType === 'release') {
    if (vsp.status !== 'draft') {
      return 'Only Draft VSPs may be released'
    }
  } else if (actionType === 'withdraw' && vsp.status !== 'draft') {
    return 'Only Draft VSPs may be withdrawn'
  } else if (actionType === 'retire' && vsp.status !== 'active') {
    return 'Only Active VSPs may be retired'
  } else if (actionType === 'delete' && vsp.status !== 'retired') {
    return 'Only Retired VSPs may be deleted'
  }
  return 'Action blocked'
}

interface ExpandableRowProps {
  data: fhir4.Library
  session: VSMSession
  handleClickRelease: (vspId: string | undefined) => void
  handleClickWithdraw: (vspId: string | undefined) => void
  handleClickRetire: (vspId: string | undefined) => void
  handleClickDelete: (vspId: string | undefined) => void
  setError: (error: Error) => void
}

const ExpandableRowComponent = ({
  data: row,
  session,
  handleClickRelease,
  handleClickWithdraw,
  handleClickRetire,
  handleClickDelete,
  setError
}: ExpandableRowProps) => {
  const canRelease = allowRelease({ session, program: row, hasApproval: true })
  const releaseBlockedReason = !canRelease && generateBlockedReason(row, 'release')
  const defaultReleaseDescription = 'Releasing a VSP will mark it as active, and it will no longer be editable'

  const canWithdraw = allowWithdraw({ session, program: row })
  const withdrawBlockedReason = !canWithdraw && generateBlockedReason(row, 'withdraw')
  const defaultWithdrawDescription = 'Withdrawing a draft VSP will delete it permanently'

  const canRetire = allowRetire({ session, program: row })
  const retireBlockedReason = !canRetire && generateBlockedReason(row, 'retire')
  const defaultRetireDescription = 'Retiring an active VSP will retire it from VSM'

  const canDelete = allowDelete({ session, program: row })
  const deleteBlockedReason = !canDelete && generateBlockedReason(row, 'delete')
  const defaultDeleteDescription = 'Deleting a retired VSP will delete it permanently'

  return (
    <div style={{ padding: '1rem', marginLeft: '48px' }}>
      <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center', paddingBottom: '2rem' }}>
        <p style={{ display: 'inline-block', marginRight: '.4rem', fontSize: '90%' }}>Actions for VSP {row.id}:</p>
        {can(session, 'release') && (
          <Tooltip title={releaseBlockedReason || defaultReleaseDescription} arrow>
            <span style={{ height: 'fit-content', alignSelf: 'center' }}>
              <Button
                size="small"
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'draft'}
                onClick={() => {
                  setError({})
                  handleClickRelease(row?.id)
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
                variant="contained"
                style={{ height: 'fit-content', whiteSpace: 'nowrap' }}
                disabled={row.status !== 'draft'}
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

const ToggleComponent = ({ handleToggleRetiredSwitch, vspsExist, showRetired }: any) => {
  if (!vspsExist) return null
  return (
    <FormGroup style={{ width: '100%', alignSelf: 'flex-start', marginTop: '1rem' }}>
      <FormControlLabel
        style={{ color: 'var(--theme-500)' }}
        control={<Switch onChange={handleToggleRetiredSwitch} />}
        label="Show retired VSPs"
        checked={showRetired}
      />
    </FormGroup>
  )
}

const ValueSetPackagesTab: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [error, setError] = useState<Error>({})

  // IG filter state
  const [igFilter, setIgFilter] = useState<string>('')

  // withdraw state
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [vspIdToWithdraw, setVspIdToWithdraw] = useState('')

  // release state
  const [releaseLoading, setReleaseLoading] = useState(false)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [vspIdToRelease, setVspIdToRelease] = useState('')

  // retire state
  const [retireLoading, setRetireLoading] = useState(false)
  const [retireModalOpen, setRetireModalOpen] = useState(false)
  const [vspIdToRetire, setVspIdToRetire] = useState('')

  // delete state
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [vspIdToDelete, setVspIdToDelete] = useState('')

  // expandable rows
  const [refreshkey, setRefreshKey] = useState(0)

  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: null
  })

  // show/hide retired VSPs
  const [showRetired, setShowRetired] = useState(false)

  // create VSP modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Read IG filter from URL on mount
  useEffect(() => {
    if (router.query['ig-url']) {
      setIgFilter(router.query['ig-url'] as string)
    }
  }, [router.query])

  const {
    data = { vsps: [], total: 0 },
    isLoading,
    mutate
  } = useSWR(
    {
      url: '/api/value-set-packages',
      args: {
        list: true,
        showRetired,
        offset: pagination?.page > 1 ? (pagination?.page - 1) * pagination.countPerPage : 0,
        count: pagination?.countPerPage,
        'ig-url': igFilter || undefined
      }
    },
    (args) =>
      fetchWithProgram(args).then((resp: VSPApiResponse) => {
        if ('error' in resp) {
          setError(resp as any)
          return { vsps: [], total: 0 }
        }
        return resp
      }),
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 0  // Disable deduplication
    }
  )

  const { vsps, total } = data

  useEffect(() => {
    if (total !== pagination?.searchTotal) {
      setPagination({ ...pagination, searchTotal: total })
    }
  }, [total, pagination.searchTotal, setPagination, pagination])

  const handlePageChange = (newPage: number) => setPagination({ ...pagination, page: newPage })

  const handleClickRelease = (vspId: string | undefined) => {
    if (!vspId) return
    setVspIdToRelease(vspId)
    setReleaseModalOpen(true)
  }

  const handleClickWithdraw = (vspId: string | undefined) => {
    if (!vspId) return
    setVspIdToWithdraw(vspId)
    setWithdrawModalOpen(true)
  }

  const handleClickRetire = (vspId: string | undefined) => {
    if (!vspId) return
    setVspIdToRetire(vspId)
    setRetireModalOpen(true)
  }

  const handleClickDelete = (vspId: string | undefined) => {
    if (!vspId) return
    setVspIdToDelete(vspId)
    setDeleteModalOpen(true)
  }

  const handleEndWithdrawAction = () => {
    setVspIdToWithdraw('')
    setWithdrawLoading(false)
    setWithdrawModalOpen(false)
  }

  const handleWithdrawDraft = async ({ id }: { id: string }) => {
    setWithdrawLoading(true)

    const withdrawParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(withdrawParameters)
    const result = await fetch(`/api/value-set-packages/${id}/withdraw`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while withdrawing VSP: ${id}.`, `${res.error}`]
      })
    } else {
      await mutate()
      toast.success(`VSP ${id} withdrawn and deleted.`)
    }
    handleEndWithdrawAction()
    closeRows()
  }

  const handleEndReleaseAction = () => {
    setVspIdToRelease('')
    setReleaseLoading(false)
    setReleaseModalOpen(false)
  }

  const handleReleaseDraft = async ({ id }: { id: string }) => {
    setReleaseLoading(true)

    const releaseParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(releaseParameters)
    const result = await fetch(`/api/value-set-packages/${id}/release`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while releasing VSP: ${id}.`, `${res.error}`]
      })
    } else {
      await mutate()
      toast.success(`VSP ${id} released successfully.`)
    }
    handleEndReleaseAction()
    closeRows()
  }

  const handleEndRetireAction = () => {
    setVspIdToRetire('')
    setRetireLoading(false)
    setRetireModalOpen(false)
  }

  const handleRetireDraft = async ({ id }: { id: string }) => {
    setRetireLoading(true)

    const retireParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(retireParameters)
    const result = await fetch(`/api/value-set-packages/${id}/retire`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while retiring VSP: ${id}.`, `${res.error}`]
      })
    } else {
      toast.success(`VSP ${id} retired.`)
      mutate()
    }
    handleEndRetireAction()
    closeRows()
  }

  const handleEndDeleteAction = () => {
    setVspIdToDelete('')
    setDeleteLoading(false)
    setDeleteModalOpen(false)
  }

  const handleDeleteRetired = async ({ id }: { id: string }) => {
    setDeleteLoading(true)

    const deleteParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(deleteParameters)
    const result = await fetch(`/api/value-set-packages/${id}/delete`, { method: 'POST', body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while deleting VSP: ${id}.`, `${res.error}`]
      })
    } else {
      await mutate()
      toast.success(`VSP ${id} deleted.`)
    }
    handleEndDeleteAction()
    closeRows()
  }

  const debouncedWithdrawVSP = debounce((vspId) => handleWithdrawDraft({ id: vspId }), 2000, { leading: true, trailing: false })
  const debouncedReleaseVSP = debounce((vspId) => handleReleaseDraft({ id: vspId }), 2000, { leading: true, trailing: false })
  const debouncedRetireVSP = debounce((vspId) => handleRetireDraft({ id: vspId }), 2000, { leading: true, trailing: false })
  const debouncedDeleteVSP = debounce((vspId) => handleDeleteRetired({ id: vspId }), 2000, { leading: true, trailing: false })

  const handleCreateVSP = async (data: CreateVSPRequest) => {
    setCreateLoading(true)
    setError({})

    try {
      console.log('Sending VSP create request:', data)
      const response = await fetch('/api/value-set-packages/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      const responseText = await response.text()
      console.log('Response text:', responseText)

      if (!response.ok) {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (parseErr) {
          throw new Error(`Failed to create VSP. Status: ${response.status}, Response: ${responseText}`)
        }
        throw new Error(errorData.error || errorData.details || 'Failed to create VSP')
      }

      const result = JSON.parse(responseText)
      await mutate()
      toast.success(`Value Set Package created successfully: ${result.vspId}`)
      setCreateModalOpen(false)

      // Navigate to the new VSP detail page
      router.push(`/value-set-packages/${result.vspId}`)
    } catch (err: any) {
      console.error('Error creating VSP:', err)
      setError({
        error: [`Error creating Value Set Package`, err.message]
      })
    } finally {
      setCreateLoading(false)
    }
  }

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
        maxWidth: '20rem',
        wrap: true,
        cell: (row: fhir4.Library) => <TextLink href={`/value-set-packages/${row.id}`} linkText={row.id} forceReload={false} />
      },
      {
        name: 'Title',
        selector: (row: fhir4.Library) => row.title || '',
        sortable: true,
        maxWidth: '20rem',
        minWidth: '15rem',
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
        name: 'IG Reference',
        selector: (row: fhir4.Library) => {
          const igArtifact = row.relatedArtifact?.find((ra) => ra.type === 'composed-of')
          return igArtifact?.resource || 'N/A'
        },
        sortable: false,
        wrap: true,
        minWidth: '20rem'
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
      }
    ],
    [session]
  )

  const handleCancelReleaseModal = () => {
    setVspIdToRelease('')
    setReleaseModalOpen(false)
  }

  const handleCancelWithdrawModal = () => {
    setVspIdToWithdraw('')
    setWithdrawModalOpen(false)
  }

  const handleCancelRetireModal = () => {
    setVspIdToRetire('')
    setRetireModalOpen(false)
  }

  const handleCancelDeleteModal = () => {
    setVspIdToDelete('')
    setDeleteModalOpen(false)
  }

  const handleToggleRetiredSwitch = (e: any) => {
    setShowRetired(e?.target?.checked || false)
  }

  const handleIGFilterChange = (newValue: string | null) => {
    const filterValue = newValue || ''
    setIgFilter(filterValue)

    // Update URL parameter
    const query: Record<string, string> = { ...router.query, resourceType: 'vsp' }
    if (filterValue) {
      query['ig-url'] = filterValue
    } else {
      delete query['ig-url']
    }
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true })
  }

  if (!data) return <LoadingIndicator />

  const closeRows = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Extract unique IG canonicals from VSPs for autocomplete
  const uniqueIGs = useMemo(() => {
    const igs = vsps.map((vsp) => {
      const igArtifact = vsp.relatedArtifact?.find((ra) => ra.type === 'composed-of')
      return igArtifact?.resource || ''
    }).filter(Boolean)
    return Array.from(new Set(igs))
  }, [vsps])

  return (
    <Col>
      {releaseModalOpen && (
        <LoadingModal
          actionType="release"
          isOpen={releaseModalOpen}
          handleModalAction={async () => {
            if (releaseLoading) return
            debouncedReleaseVSP(vspIdToRelease)
          }}
          program={null}
          loading={releaseLoading}
          handleCancelModal={() => handleCancelReleaseModal()}
        />
      )}
      {withdrawModalOpen && (
        <LoadingModal
          actionType="withdraw"
          isOpen={withdrawModalOpen}
          handleModalAction={async () => {
            if (withdrawLoading) return
            debouncedWithdrawVSP(vspIdToWithdraw)
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
            if (retireLoading) return
            debouncedRetireVSP(vspIdToRetire)
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
            if (deleteLoading) return
            debouncedDeleteVSP(vspIdToDelete)
          }}
          program={null}
          loading={deleteLoading}
          handleCancelModal={() => handleCancelDeleteModal()}
        />
      )}

      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <Autocomplete
          freeSolo
          options={uniqueIGs}
          value={igFilter}
          onChange={(event, newValue) => handleIGFilterChange(newValue)}
          onInputChange={(event, newInputValue) => {
            if (event?.type === 'change') {
              handleIGFilterChange(newInputValue)
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filter by IG Canonical"
              placeholder="Enter IG canonical URL..."
              size="small"
            />
          )}
          style={{ minWidth: '400px', maxWidth: '600px' }}
        />
      </Row>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
        {(can(session, 'release') || can(session, 'withdraw') || can(session, 'retire') || can(session, 'delete')) && (
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
            Expand a row to view VSP Actions
          </div>
        )}
        {isAdmin(session) && (
          <Button
            variant="contained"
            onClick={() => setCreateModalOpen(true)}
            style={{
              alignSelf: 'flex-end',
              marginBottom: '1rem',
              backgroundColor: 'var(--theme-400)',
              color: 'white'
            }}
          >
            Create Value Set Package
          </Button>
        )}
      </div>

      <CreateVSPModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateVSP}
        loading={createLoading}
      />

      <ErrorMessage error={error?.error || null} handleClose={() => setError({})} />

      <DT
        subHeader={Boolean(vsps?.length) || undefined}
        subHeaderComponent={
          <ToggleComponent vspsExist={Boolean(vsps?.length)} handleToggleRetiredSwitch={handleToggleRetiredSwitch} showRetired={showRetired} />
        }
        className="vsp-tab-table"
        key={refreshkey}
        data={vsps}
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
        expandableRows={can(session, 'release') || can(session, 'withdraw') || can(session, 'retire') || can(session, 'delete')}
        // @ts-ignore
        expandableRowsComponent={ExpandableRowComponent}
        expandableRowsComponentProps={{
          session,
          handleClickRelease,
          handleClickWithdraw,
          handleClickRetire,
          handleClickDelete,
          setError
        }}
      />
    </Col>
  )
}

export default ValueSetPackagesTab
