import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button, Tooltip } from '@mui/material'
import { PageTitle } from '@/components/Typography'
import { useSession } from 'next-auth/react'
import { allowEditing, allowRelease, allowWithdraw, allowRetire, allowDelete, can, VSMSession } from '@/helpers/rolesHelper'
import { StatusChip } from '@/components/data-display/Chips'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
import { getVSPManifestVersions, findUnversionedManifestRefs } from '@/helpers/valueSetHelpers'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { ErrorMessage } from '@/components/ErrorMessage'
import { ExportPackageDetailsModal } from '@/components/modals/PackageDetailsModal'
import ConfirmUnversionedRefsModal from '@/components/modals/ConfirmUnversionedRefsModal'
import { toast } from 'react-toastify'
import { debounce } from 'lodash'
import styled from 'styled-components'
import { StyledSpan } from '@/styles'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import VSPMetadata from '@/components/VSPMetadata'
import { Row, Col, MetadataTitle, ManifestContainer } from './styles'
import { apiFetch } from '@/utils'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'

const ActionButtonContainer = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const IGReferenceContainer = styled.div`
  margin-top: 24px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
`

interface Error {
  error?: string | string[]
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

const VSPDetails = ({ program: initialVSP }: LibraryServerSideProps) => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [currentVSP, setVSP] = useState<fhir4.Library>(initialVSP)
  const [error, setError] = useState<Error>({})

  // Release state
  const [releaseLoading, setReleaseLoading] = useState(false)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [releaseUnversionedConfirmOpen, setReleaseUnversionedConfirmOpen] = useState(false)

  // Withdraw state
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)

  // Retire state
  const [retireLoading, setRetireLoading] = useState(false)
  const [retireModalOpen, setRetireModalOpen] = useState(false)

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Export state
  const [exportError, setExportError] = useState<null | string>(null)
  const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)

  const handleCloseErrors = () => {
    setError({})
  }

  const updateVSP = async ({ program, isExperimental }: { program: fhir4.Library; isExperimental: boolean }) => {
    const endPoint = `/api/value-set-packages/${currentVSP?.id}?experimental=${isExperimental}`
    const response = await apiFetch(endPoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(program)
    })

    if (!response.ok) {
      setVSP(program)
    } else {
      const json = await response.json()
      setVSP(json)
    }
  }

  const { id = '', status, experimental } = currentVSP
  const manifestData = getVSPManifestVersions(currentVSP)
  const unversionedReleaseRefs = findUnversionedManifestRefs(currentVSP)
  const hasUnversionedReleaseRefs =
    unversionedReleaseRefs.codeSystems.length + unversionedReleaseRefs.valueSets.length > 0

  const startRelease = () => {
    setError({})
    if (hasUnversionedReleaseRefs) {
      setReleaseUnversionedConfirmOpen(true)
    } else {
      setReleaseModalOpen(true)
    }
  }

  // Get IG reference from relatedArtifact
  const igReference = currentVSP.relatedArtifact?.find((ra) => ra.type === 'composed-of')?.resource || 'N/A'

  // Permission checks
  const canRelease = allowRelease({ session, program: currentVSP, hasApproval: true })
  const releaseBlockedReason = !canRelease && generateBlockedReason(currentVSP, 'release')
  const defaultReleaseDescription = 'Releasing a VSP will mark it as active, and it will no longer be editable'

  const canWithdraw = allowWithdraw({ session, program: currentVSP })
  const withdrawBlockedReason = !canWithdraw && generateBlockedReason(currentVSP, 'withdraw')
  const defaultWithdrawDescription = 'Withdrawing a draft VSP will delete it permanently'

  const canRetire = allowRetire({ session, program: currentVSP })
  const retireBlockedReason = !canRetire && generateBlockedReason(currentVSP, 'retire')
  const defaultRetireDescription = 'Retiring an active VSP will retire it from VSM'

  const canDelete = allowDelete({ session, program: currentVSP })
  const deleteBlockedReason = !canDelete && generateBlockedReason(currentVSP, 'delete')
  const defaultDeleteDescription = 'Deleting a retired VSP will delete it permanently'

  // Action handlers
  const handleReleaseDraft = async () => {
    setReleaseLoading(true)
    try {
      const result = await apiFetch(`/api/value-set-packages/${id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latestFromTxServer: false })
      })

      if (!result.ok) {
        const res = await result.json()
        setError({
          error: [`Error occurred while releasing VSP: ${id}.`, `${res.error}`]
        })
      } else {
        const res = await result.json()
        NotificationStore.addJob({
          jobId: res.id,
          jobType: JOB_TYPE.RELEASE,
          metadata: {
            programId: id,
            programTitle: currentVSP?.title || id,
            latestFromTxServer: false
          },
          onSuccess: async () => {
            toast.success(`VSP ${id} released successfully.`)
            router.replace(router.asPath)
          },
          onFailure: (error: string) => toast.error(`Release failed for VSP ${id}: ${error}`)
        })
        toast.info('VSP release in progress.')
      }
    } catch (e) {
      setError({ error: ['An unexpected error occurred.'] })
    } finally {
      setReleaseLoading(false)
      setReleaseModalOpen(false)
    }
  }

  const handleWithdrawDraft = async () => {
    setWithdrawLoading(true)

    const withdrawParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(withdrawParameters)
    const result = await apiFetch(`/api/value-set-packages/${id}/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while withdrawing VSP: ${id}.`, `${res.error}`]
      })
      setWithdrawLoading(false)
      setWithdrawModalOpen(false)
    } else {
      toast.success(`VSP ${id} withdrawn and deleted.`)
      // Navigate back to list
      router.push('/programs?resourceType=vsp')
    }
  }

  const handleRetireDraft = async () => {
    setRetireLoading(true)

    const retireParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(retireParameters)
    const result = await apiFetch(`/api/value-set-packages/${id}/retire`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while retiring VSP: ${id}.`, `${res.error}`]
      })
      setRetireLoading(false)
      setRetireModalOpen(false)
    } else {
      setRetireLoading(false)
      setRetireModalOpen(false)
      toast.success(`VSP ${id} retired.`)
      // Refresh the page to get updated VSP
      router.replace(router.asPath)
    }
  }

  const handleDeleteRetired = async () => {
    setDeleteLoading(true)

    const deleteParameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const parameters = JSON.stringify(deleteParameters)
    const result = await apiFetch(`/api/value-set-packages/${id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: parameters })

    if (!result.ok) {
      const res = await result.json()
      setError({
        error: [`Error occurred while deleting VSP: ${id}.`, `${res.error}`]
      })
      setDeleteLoading(false)
      setDeleteModalOpen(false)
    } else {
      setDeleteLoading(false)
      setDeleteModalOpen(false)
      toast.success(`VSP ${id} deleted.`)
      // Navigate back to list
      router.push('/programs?resourceType=vsp')
    }
  }

  const debouncedReleaseVSP = debounce(handleReleaseDraft, 2000, { leading: true, trailing: false })
  const debouncedWithdrawVSP = debounce(handleWithdrawDraft, 2000, { leading: true, trailing: false })
  const debouncedRetireVSP = debounce(handleRetireDraft, 2000, { leading: true, trailing: false })
  const debouncedDeleteVSP = debounce(handleDeleteRetired, 2000, { leading: true, trailing: false })

  return (
    <Col>
      {/* Modals */}
      <ConfirmUnversionedRefsModal
        isOpen={releaseUnversionedConfirmOpen}
        action="release"
        codeSystems={unversionedReleaseRefs.codeSystems}
        valueSets={unversionedReleaseRefs.valueSets}
        onCancel={() => setReleaseUnversionedConfirmOpen(false)}
        onConfirm={() => {
          setReleaseUnversionedConfirmOpen(false)
          setReleaseModalOpen(true)
        }}
      />
      {releaseModalOpen && (
        <LoadingModal
          actionType="release"
          isOpen={releaseModalOpen}
          handleModalAction={async () => {
            if (releaseLoading) return
            debouncedReleaseVSP()
          }}
          program={null}
          loading={releaseLoading}
          handleCancelModal={() => setReleaseModalOpen(false)}
          resourceType="vsp"
        />
      )}
      {withdrawModalOpen && (
        <LoadingModal
          actionType="withdraw"
          isOpen={withdrawModalOpen}
          handleModalAction={async () => {
            if (withdrawLoading) return
            debouncedWithdrawVSP()
          }}
          program={null}
          loading={withdrawLoading}
          handleCancelModal={() => setWithdrawModalOpen(false)}
          resourceType="vsp"
        />
      )}
      {retireModalOpen && (
        <LoadingModal
          actionType="retire"
          isOpen={retireModalOpen}
          handleModalAction={async () => {
            if (retireLoading) return
            debouncedRetireVSP()
          }}
          program={null}
          loading={retireLoading}
          handleCancelModal={() => setRetireModalOpen(false)}
          resourceType="vsp"
        />
      )}
      {deleteModalOpen && (
        <LoadingModal
          actionType="delete"
          isOpen={deleteModalOpen}
          handleModalAction={async () => {
            if (deleteLoading) return
            debouncedDeleteVSP()
          }}
          program={null}
          loading={deleteLoading}
          handleCancelModal={() => setDeleteModalOpen(false)}
          resourceType="vsp"
        />
      )}

      {error?.error && <ErrorMessage style={{ marginBottom: '2em' }} error={error.error} handleClose={handleCloseErrors} />}
      {exportError && <ErrorMessage style={{ marginBottom: '2em' }} error={exportError} handleClose={() => setExportError(null)} />}

      {/* Header with Title and Status */}
      <Row style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusChip
            style={{ transform: 'translateY(-10px) translateX(8px)' }}
            label={status}
            experimental={Boolean(experimental)}
          />
        </MetadataTitle>
        <Col style={{ width: 'auto', display: 'flex', gap: '0.8rem' }}>
          <Button
            variant="contained"
            onClick={() => router.push(`/value-set-packages/compare?source=${id}`)}
          >
            Compare Versions
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setExportError(null)
              setShowExportOptionsModal(true)
            }}
          >
            Export
          </Button>
          <ExportPackageDetailsModal
            isOpen={showExportOptionsModal}
            program={currentVSP}
            setExportError={setExportError}
            toggleModalOpen={() => setShowExportOptionsModal(false)}
            resourceType="vsp"
          />
        </Col>
      </Row>

      {/* Action Buttons */}
      {(can(session, 'release') || can(session, 'withdraw') || can(session, 'retire') || can(session, 'delete')) && (
        <ActionButtonContainer>
          {can(session, 'release') && (
            <Tooltip title={releaseBlockedReason || defaultReleaseDescription} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled={currentVSP.status !== 'draft'}
                  onClick={startRelease}
                  style={{
                    backgroundColor: currentVSP.status === 'draft' ? 'var(--theme-400)' : undefined
                  }}
                >
                  Release VSP
                </Button>
              </span>
            </Tooltip>
          )}
          {can(session, 'withdraw') && (
            <Tooltip title={withdrawBlockedReason || defaultWithdrawDescription} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled={currentVSP.status !== 'draft'}
                  onClick={() => {
                    setError({})
                    setWithdrawModalOpen(true)
                  }}
                  color="warning"
                >
                  Withdraw VSP
                </Button>
              </span>
            </Tooltip>
          )}
          {can(session, 'retire') && (
            <Tooltip title={retireBlockedReason || defaultRetireDescription} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled={currentVSP.status !== 'active'}
                  onClick={() => {
                    setError({})
                    setRetireModalOpen(true)
                  }}
                  color="warning"
                >
                  Retire VSP
                </Button>
              </span>
            </Tooltip>
          )}
          {can(session, 'delete') && (
            <Tooltip title={deleteBlockedReason || defaultDeleteDescription} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled={currentVSP.status !== 'retired'}
                  onClick={() => {
                    setError({})
                    setDeleteModalOpen(true)
                  }}
                  color="error"
                >
                  Delete VSP
                </Button>
              </span>
            </Tooltip>
          )}
        </ActionButtonContainer>
      )}

      {/* IG Reference */}
      <IGReferenceContainer>
        <StyledSpan style={{ marginBottom: '8px', display: 'block' }}>Implementation Guide Reference</StyledSpan>
        <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{igReference}</div>
      </IGReferenceContainer>

      {/* VSP Metadata */}
      <StyledSpan style={{ marginBottom: '12px', marginTop: '24px' }}>VSP Metadata</StyledSpan>
      <VSPMetadata vsp={currentVSP} handleSubmit={updateVSP} editable={allowEditing({ session, program: currentVSP })} />

      {/* Manifest Section */}
      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>VSP Manifest</StyledSpan>
          {allowEditing({ session, program: currentVSP }) && (
            <Button variant="contained" onClick={() => router.push(`/value-set-packages/${id}/manifest`)}>
              Edit Manifest
            </Button>
          )}
        </Row>
        <ManifestDetailTable
          programId={currentVSP?.id!}
          manifestData={{
            ...manifestData.codeSystems,
            ...manifestData.valueSets
          }}
          resourceType="vsp"
          unversionedSeverity="info"
        />
      </ManifestContainer>
    </Col>
  )
}

export default VSPDetails
