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
import { allowEditing, can, VSMSession } from '@/helpers/rolesHelper'
import { Row, Col, MetadataTitle, StatusTag, ManifestContainer, IndicatorContainer } from './styles'
import { StyledSpan } from '@/styles'
import { ApprovalDetailList } from '../ApprovalDetailList'
import { ErrorMessage } from '../ErrorMessage'
import { ExportPackageDetailsModal } from '../modals/PackageDetailsModal'
import { StatusChip } from '../data-display/Chips'

const ProgramDetails = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const programId = router.query.id as string
  const [program, setProgram] = useState<fhir4.Library>()
  const [refreshData, setRefreshData] = useState(false)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId, toggleRefresh: refreshData })
  const [exportError, setExportError] = useState<null | string>(null)
  const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)

  const toggleRefreshData = () => {
    setRefreshData(!refreshData)
  }

  const handleCloseErrors = () => {
    setExportError(null)
  }

  useEffect(() => {
    // Set initial program
    if (is.library(programAndGrouperData?.program)) {
      setProgram(programAndGrouperData?.program)
    }
  }, [programId, programAndGrouperData?.program])

  const updateProgram = async ({ program, isExperimental }: {program: fhir4.Library, isExperimental: boolean }) => {
    const endPoint = `/api/programs/${programId}?experimental=${isExperimental}`
    const response = await fetch(endPoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(program)
    })

    // If there is an error in the PUT request to update the library, reset the program to default
    if (!response.ok) {
      setProgram(program)
    } else {
      const json = await response.json()
      setProgram(json)
    }
  }


  // early return if no data, must be a library if there's data
  if (!is.library(program)) {
    return (
      <IndicatorContainer>
        <LoadingIndicator size="large" />
      </IndicatorContainer>
    )
  }

  const { id = '', status, experimental } = program
  return (
    <Col>
      {exportError && <ErrorMessage style={{ marginBottom: '2em' }} error={exportError} handleClose={handleCloseErrors}/>}
      <Row style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusChip style={{ transform: 'translateY(-10px) translateX(8px)' }}label={status} experimental={Boolean(experimental)} />
        </MetadataTitle>
        <Col style={{ width: 'auto' }}>
          <Button
            id="view-valuesets"
            text="View ValueSets"
            onClick={() => router.push(`/programs/${id}/valuesets`)}
            style={{ marginBottom: '15px' }}
          />
          <Button
            text={'Export'}
            onClick={() => {
              setExportError(null)
              setShowExportOptionsModal(true)
            }}
          />
          <ExportPackageDetailsModal
            isOpen={showExportOptionsModal}
            program={program}
            setExportError={setExportError}
            toggleModalOpen={() => setShowExportOptionsModal(false)}
          />
        </Col>
      </Row>
      <StyledSpan style={{ marginBottom: '12px' }}>Program Metadata</StyledSpan>
      <ProgramMetadata program={program} handleSubmit={updateProgram} editable={allowEditing({ session, programStatus: status })} />
      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>Program Manifest</StyledSpan>
          {allowEditing({ session, programStatus: status }) && (
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
        {allowEditing({ session, programStatus: status }) && (
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
      <ApprovalDetailList loading={programAndGrouperDataLoading} assessments={programAndGrouperData?.artifactAssessments} />
    </Col>
  )
}

export default ProgramDetails
