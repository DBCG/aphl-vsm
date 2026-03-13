import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { GrouperOverviewTable } from '@/components/GrouperOverviewTable'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import { useSession } from 'next-auth/react'
import ProgramMetadata from '@/components/ProgramMetadata'
import { allowEditing, can, VSMSession } from '@/helpers/rolesHelper'
import { Row, Col, MetadataTitle, ManifestContainer, IndicatorContainer } from './styles'
import { StyledSpan } from '@/styles'
import { ApprovalDetailList } from '../ApprovalDetailList'
import { ErrorMessage } from '../ErrorMessage'
import { ExportPackageDetailsModal } from '../modals/PackageDetailsModal'
import { StatusChip } from '../data-display/Chips'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
import { getProgramManifestVersions } from '@/helpers/valueSetHelpers'
import { isReleaseInProgress } from '@/helpers/libraryHelpers'
import { apiFetch } from '@/utils'

const ProgramDetails = ({ program }: LibraryServerSideProps) => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [currentProgram, setProgram] = useState<fhir4.Library>(program)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails(currentProgram?.id!)
  const [exportError, setExportError] = useState<null | string>(null)
  const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)

  const handleCloseErrors = () => {
    setExportError(null)
  }

  const updateProgram = async ({ program, isExperimental }: { program: fhir4.Library; isExperimental: boolean }) => {
    const endPoint = `/api/programs/${currentProgram?.id}?experimental=${isExperimental}`
    const response = await apiFetch(endPoint, {
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

  const { id = '', status, experimental } = currentProgram
  const manifestData = getProgramManifestVersions(currentProgram)
  const isReleasing = isReleaseInProgress(currentProgram)
  return (
    <Col>
      {exportError && <ErrorMessage style={{ marginBottom: '2em' }} error={exportError} handleClose={handleCloseErrors} />}
      <Row style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusChip
            style={{ transform: 'translateY(-10px) translateX(8px)' }}
            label={isReleasing ? 'Releasing...' : status}
            experimental={Boolean(experimental)}
          />
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
            program={currentProgram}
            setExportError={setExportError}
            toggleModalOpen={() => setShowExportOptionsModal(false)}
          />
        </Col>
      </Row>
      <StyledSpan style={{ marginBottom: '12px' }}>Program Metadata</StyledSpan>
      <ProgramMetadata program={currentProgram} handleSubmit={updateProgram} editable={allowEditing({ session, program })} />
      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>Program Manifest</StyledSpan>
          {allowEditing({ session, program }) && (
            <Button id="edit-manifest" text="Edit Manifest" onClick={() => router.push(`/programs/${id}/manifest`)} />
          )}
        </Row>
        <ManifestDetailTable programId={currentProgram?.id!} manifestData={manifestData} />
      </ManifestContainer>
      <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
        <StyledSpan>Included Groups</StyledSpan>
        {allowEditing({ session, program }) && (
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
        grouperLibId={programAndGrouperData?.grouperLibrary?.id}
        program={programAndGrouperData?.program}
      />
      <Row style={{ alignItems: 'center', marginBottom: '12px', marginTop: '32px' }}>
        <Col style={{ width: 'auto' }}>
          <StyledSpan>Approvals</StyledSpan>
        </Col>
        {!isReleasing && can(session, 'approve') && (
          <Col style={{ width: 'auto' }}>
            <Button id="approve" text="Approve Now!" onClick={() => router.push(`/programs/${id}/approve`)} />
          </Col>
        )}
      </Row>
      <ApprovalDetailList loading={programAndGrouperDataLoading} assessments={programAndGrouperData?.artifactAssessments} />
    </Col>
  )
}

export default ProgramDetails
