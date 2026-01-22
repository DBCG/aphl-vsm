import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { useSession } from 'next-auth/react'
import { allowEditing, VSMSession } from '@/helpers/rolesHelper'
import { StyledSpan } from '@/styles'
import { ErrorMessage } from '../ErrorMessage'
import { StatusChip } from '../data-display/Chips'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
import { getVSPManifestVersions } from '@/helpers/valueSetHelpers'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import styled from 'styled-components'

const Col = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
`

const MetadataTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const ManifestContainer = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
`

const MetadataContainer = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
`

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
  margin-top: 1rem;
`

const MetadataLabel = styled.div`
  font-weight: 600;
  color: var(--theme-500);
`

const MetadataValue = styled.div`
  color: #333;
`

interface VSPDetailsProps {
  vsp: fhir4.Library
}

const VSPDetails = ({ vsp }: VSPDetailsProps) => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [currentVSP, setVSP] = useState<fhir4.Library>(vsp)
  const [error, setError] = useState<null | string>(null)

  const handleCloseErrors = () => {
    setError(null)
  }

  const updateVSP = async (updatedVSP: fhir4.Library) => {
    // Extract IG experimental flag from relatedArtifact if needed
    const igExperimental = currentVSP.experimental || false
    const endPoint = `/api/value-set-packages/${currentVSP?.id}?igExperimental=${igExperimental}`
    const response = await fetch(endPoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedVSP)
    })

    if (!response.ok) {
      const errorData = await response.json()
      setError(errorData.error || 'Failed to update VSP')
      setVSP(currentVSP) // Reset on error
    } else {
      const json = await response.json()
      setVSP(json)
    }
  }

  const { id = '', status, experimental, title, version, description } = currentVSP

  // Extract IG canonical from relatedArtifact
  const igArtifact = currentVSP.relatedArtifact?.find((ra) => ra.type === 'composed-of')
  const igCanonical = igArtifact?.resource || 'N/A'

  // Get manifest data (both CodeSystems and ValueSets)
  const manifestData = getVSPManifestVersions(currentVSP)

  return (
    <Col>
      {error && <ErrorMessage style={{ marginBottom: '2em' }} error={error} handleClose={handleCloseErrors} />}
      <Row style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <MetadataTitle>
          <PageTitle>{id}</PageTitle>
          <StatusChip style={{ transform: 'translateY(-10px) translateX(8px)' }} label={status} experimental={Boolean(experimental)} />
        </MetadataTitle>
      </Row>

      <StyledSpan style={{ marginBottom: '12px' }}>Value Set Package Metadata</StyledSpan>
      <MetadataContainer>
        <MetadataGrid>
          <MetadataLabel>Title:</MetadataLabel>
          <MetadataValue>{title || 'N/A'}</MetadataValue>

          <MetadataLabel>Version:</MetadataLabel>
          <MetadataValue>{version || 'N/A'}</MetadataValue>

          <MetadataLabel>Status:</MetadataLabel>
          <MetadataValue>{status}</MetadataValue>

          <MetadataLabel>Experimental:</MetadataLabel>
          <MetadataValue>{experimental ? 'Yes' : 'No'}</MetadataValue>

          <MetadataLabel>Description:</MetadataLabel>
          <MetadataValue>{description || 'N/A'}</MetadataValue>

          <MetadataLabel>IG Reference:</MetadataLabel>
          <MetadataValue>{igCanonical}</MetadataValue>
        </MetadataGrid>
      </MetadataContainer>

      <ManifestContainer>
        <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
          <StyledSpan>VSP Manifest</StyledSpan>
          {allowEditing({ session, program: currentVSP }) && (
            <Button id="edit-manifest" text="Edit Manifest" onClick={() => router.push(`/value-set-packages/${id}/manifest`)} />
          )}
        </Row>

        {/* CodeSystem Manifest */}
        {Object.keys(manifestData.codeSystems).length > 0 && (
          <>
            <StyledSpan style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>CodeSystem Versions</StyledSpan>
            <ManifestDetailTable programId={currentVSP?.id!} manifestData={manifestData.codeSystems} />
          </>
        )}

        {/* ValueSet Manifest */}
        {Object.keys(manifestData.valueSets).length > 0 && (
          <>
            <StyledSpan style={{ fontSize: '0.9rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>ValueSet Versions</StyledSpan>
            <ManifestDetailTable programId={currentVSP?.id!} manifestData={manifestData.valueSets} />
          </>
        )}

        {Object.keys(manifestData.codeSystems).length === 0 && Object.keys(manifestData.valueSets).length === 0 && (
          <div style={{ padding: '1rem', color: '#666' }}>No manifest data available. Click "Edit Manifest" to add version pins.</div>
        )}
      </ManifestContainer>
    </Col>
  )
}

export default VSPDetails
