import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Modal from 'react-modal'
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

const ProgramDetails = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const programId = router.query.id as string
  const [program, setProgram] = useState<fhir4.Library>()
  const [refreshData, setRefreshData] = useState(false)
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId, toggleRefresh: refreshData })
  const fetchedProgram = useGetProgramById({ programId })

  useEffect(() => Modal.setAppElement('#__next'), [])

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
      <Row style={{ justifyContent: 'space-between' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusTag status={status}>{status}</StatusTag>
        </MetadataTitle>
        <Button id="view-valuesets" text="View ValueSets" onClick={() => router.push(`/programs/${id}/valuesets`)} />
      </Row>
      <StyledSpan style={{ marginBottom: '12px' }}>Program Metadata</StyledSpan>
      <ProgramMetadata program={program} handleSubmit={handleSubmit} editable={can(session, 'edit') && status === 'draft'} />
      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>Program Manifest</StyledSpan>
          {program.status !== 'active' && (
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
      <ApprovalDetailList loading={programAndGrouperDataLoading} assessments={programAndGrouperData?.artifactAssessments} />
    </Col>
  )
}

export default ProgramDetails
