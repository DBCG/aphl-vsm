import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { GrouperOverviewTable } from '@/components/GrouperOverviewTable'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import { is } from '@/helpers/is'
import { useSession } from 'next-auth/react'
import LoadingIndicator from '@/components/LoadingIndicator'
import ProgramMetadata from '@/components/ProgramMetadata'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { Row, Col, MetadataTitle, StatusTag, ManifestContainer, IndicatorContainer } from './styles'
import { StyledSpan } from '@/styles'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { ApprovalDetailList } from '../ApprovalDetailList'
import { ErrorMessage } from '../ErrorMessage'
import { PackageDetailsModal } from '../modals/PackageDetailsModal'
import { Stack } from '@mui/material'

const ProgramDetails = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const programId = router.query.id as string
  const [program, setProgram] = useState<fhir4.Library>()
  const [refreshData, setRefreshData] = useState(false)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId, toggleRefresh: refreshData })
  const fetchedProgram = useGetProgramById({ programId })
  const [releaseError, setReleaseError] = useState<null | string>(null)
  const [isReleasing, setIsReleasing] = useState(false)
  const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)

  const toggleRefreshData = () => {
    setRefreshData(!refreshData)
  }

  useEffect(() => {
    // Set initial program
    if (is.library(fetchedProgram)) {
      setProgram(fetchedProgram)
    }
  }, [programId, fetchedProgram])

  const handleSubmit = async (submittedProgram: fhir4.Library) => {
    await updateProgram(submittedProgram)
  }

  const updateProgram = async (toUpdateProgram: fhir4.Library) => {
    const response = await fetch(`/api/programs/${router.query.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(toUpdateProgram)
    })

    // If there is an error in the PUT request to update the library, reset the program to default
    if (!response.ok) {
      setProgram(program)
    } else {
      const json = await response.json()
      setProgram(json)
    }
  }

  const handleReleaseProgram = async () => {
    try {
      setReleaseError(null)
      setIsReleasing(true)
      const endpoint = `/api/programs/${programId}/release`
      const releaseRes = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(program)
      })

      if (!releaseRes.ok) {
        const failRes = await releaseRes.json()
        setReleaseError(failRes.error)
        setIsReleasing(false)
        return
      } else {
        setIsReleasing(false)
        router.push('/programs')
      }
    } catch (e) {
      setReleaseError('Program release failed.')
      setIsReleasing(false)
      return
    }
  }
  const downloadObject = (json: any) => {
    // https://stackoverflow.com/a/55613750/8144343
    const stringified = JSON.stringify(json, null, 2)
    const blob = new Blob([stringified], { type: 'application/fhir+json' })
    const href = URL.createObjectURL(blob)
    // create "a" HTLM element with href to file
    const link = document.createElement('a')
    link.href = href
    link.download = `${programAndGrouperData.program?.name}-bundle.json`
    document.body.appendChild(link)
    link.click()

    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  }
  const allowToEdit = can(session, 'edit') && program?.status === 'draft'

  const releaseButton = (() => {
    if (allowToEdit) {
      return (
        <Button
          text="Release"
          loading={isReleasing}
          style={{ minHeight: '40px', minWidth: '150px', marginBottom: '.5rem' }}
          onClick={() => handleReleaseProgram()}
        />
      )
    }
    return null
  })()

  // early return if no data, must be a library if there's data
  if (!is.library(program)) {
    return (
      <IndicatorContainer>
        <LoadingIndicator size="large" />
      </IndicatorContainer>
    )
  }

  const { id = '', status } = program
  return (
    <Col>
      <Row style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusTag status={status}>{status}</StatusTag>
        </MetadataTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button id="view-valuesets" text="View ValueSets" onClick={() => router.push(`/programs/${id}/valuesets`)} />
          <Button text={'Export'} onClick={() => setShowExportOptionsModal(true)}></Button>
          <PackageDetailsModal
            isOpen={showExportOptionsModal}
            toggleModalOpen={() => setShowExportOptionsModal(false)}
            handleDownloadClick={async (useV2, xml) =>
              fetch(`/api/programs/${router.query.id}/package`, {
                method: 'POST',
                body: JSON.stringify({ parameters: {}, xml: xml })
              })
                .then((data) => data.json())
                .then((json) => downloadObject(json))
            }
          />
        </Stack>
      </Row>
      <StyledSpan style={{ marginBottom: '12px' }}>Program Metadata</StyledSpan>

      <ProgramMetadata program={program} handleSubmit={handleSubmit} editable={can(session, 'edit') && status === 'draft'} />
      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>Program Manifest</StyledSpan>
          {can(session, 'edit') && status === 'draft' && (
            <Button id="edit-manifest" text="Edit Manifest" onClick={() => router.push(`/programs/${id}/manifest`)} />
          )}
        </Row>
        <ManifestDetailTable
          programId={programId}
          data={programAndGrouperData?.manifestData}
          loading={programAndGrouperData?.manifestData == null}
        />
      </ManifestContainer>
      <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
        <StyledSpan>Included Groups</StyledSpan>
        {can(session, 'edit') && status === 'draft' && (
          <Button
            id="create-new-grouper"
            text="Create New Grouper"
            onClick={() => {
              router.push(`/programs/${router.query.id}/grouper`)
            }}
          />
        )}
      </Row>
      <GrouperOverviewTable
        toggleRefreshData={toggleRefreshData}
        grouperLibId={programAndGrouperData?.grouperLibrary?.id}
        // @ts-ignore-next-line
        programStatus={programAndGrouperData?.program?.status}
      />
      <Row style={{ alignItems: 'center', marginBottom: '12px', marginTop: '32px' }}>
        <Col style={{ width: 'auto' }}>
          <StyledSpan>Approvals</StyledSpan>
        </Col>
        <Col style={{ width: 'auto' }}>
          <Button id="approve" text="Approve Now!" onClick={() => router.push(`/programs/${id}/approve`)} />
        </Col>
      </Row>
      {releaseError && <ErrorMessage error={releaseError} />}
      <ApprovalDetailList loading={programAndGrouperDataLoading} assessments={programAndGrouperData?.artifactAssessments} />
    </Col>
  )
}

export default ProgramDetails
