import React, { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Modal from 'react-modal'
import toast, { Toaster } from 'react-hot-toast'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { useGetProgramDetails, Result } from '@/hooks/useGetProgramDetails'
import { useIsEditing } from '@/hooks/useIsEditing'
import { getReleaseDescription, setReleaseDescription } from '@/helpers/libraryHelpers'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { is } from '@/helpers/is'
import { getSession, GetSessionParams } from 'next-auth/react'
import LoadingIndicator from '@/components/LoadingIndicator'
import { StatusProps } from '..'
import EditableInput from '@/components/EditableInput'
import ProgramEditModalContent from '@/components/ProgramEditModalContent'

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  text-align: left;
  &.inputs {
    gap: 24px;
    margin-bottom: 16px;
  }
  &.readonly-inputs {
    flex-direction: column;
    justify-content: flex-start;
    column-gap: 8px;
    row-gap: 14px;
    margin-bottom: 12px;
  }
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const MetadataTitle = styled.div`
  display: flex;
  align-items: center;
`

const StatusTag = styled.div<StatusProps>`
  border-radius: 8px;
  padding: 12px 24px;
  height: fit-content;
  color: ${
    props => props.status === 'active'
    ? 'white'
    : '#ca9547'
  };
  font-weight: bold;
  text-transform: uppercase;
  background-color: ${
    props => props.status === 'active'
    ? 'rgba(46, 192, 205, 1)'
    : 'white'
  };
`

export const ItemWrapper = styled.div`
  color: var(--theme-500);
  min-width: 300px;
`

export const FieldTitle = styled.div`
  background-color: white;
  display: inline-block;
  max-width: 120px;
  padding: 4px 8px;
  margin-right: 8px;
  border-radius: 4px;
`

const StyledSpan = styled.span`
  color: var(--theme-500);
  margin-top: 12px;
`

const IndicatorContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding-top: 100px;
`

export const FieldValue = styled.span`
  white-space: pre-line;
`

const ProgramDetails: NextPage = () => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useIsEditing()
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string) as Result
  const [program, setProgram] = useState<fhir4.Library>()

  useEffect(() => Modal.setAppElement('#__next'), [])

  useEffect(() => {
    // Set initial program
    if (is.library(programAndGrouperInfo?.program)) {
      setProgram(programAndGrouperInfo?.program)
    }
  }, [programAndGrouperInfo.program])

  const handleSubmit = async (submittedProgram: fhir4.Library) => {
    setIsEditing()
    await updateProgram(submittedProgram)
    router.push(`/programs`)
  }

  const updateProgram = async (toUpdateProgram: fhir4.Library) => {
    const response = await fetch(`/api/programs/${router.query.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toUpdateProgram)
    })

    // If there is an error in the PUT request to update the library, reset the program to default
    if (!response.ok) {
      setProgram(program)
    }
  }

  // early return if no data, must be a library if there's data
  if (!is.library(program)) {
    return (
      <IndicatorContainer>
        <LoadingIndicator size='large'/>
      </IndicatorContainer>
    )
  }

  const { id='', name='', version='', title='', description='', status } = program
  const releaseDescription = getReleaseDescription(program)
  console.log('releaseDescription', releaseDescription)
  return (
    <Col>
      <Row style={{ justifyContent: 'space-between' }}>
        <MetadataTitle>
          <PageTitle style={{ marginRight: '12px' }}>{id}</PageTitle>
          <StatusTag status={status}>{status}</StatusTag>
        </MetadataTitle>
        {status === 'draft' && (
          <Button
            style={{ marginBottom: '12px', width: '150px', lineHeight: '130%' }}
            text='Edit Program Metadata'
            onClick={() => setIsEditing()}
          />
        )}
      </Row>
      <Modal
        isOpen={isEditing}
        style={{
          content: {
            border: 'none',
            backgroundColor: '#C4E8EC',
            textAlign: 'right'
          }
        }}
        contentLabel='Edit Program Details'
      >
        <button onClick={() => setIsEditing()}>close</button>
        <div>
          <Row className='inputs'>
            <ProgramEditModalContent
              program={program}
              handleSubmit={handleSubmit}
             />
          </Row>
        </div>
      </Modal>
      {false ? (
        null
      ) : (
          <div>
            <Row className='readonly-inputs'>
              <ItemWrapper>
                <FieldTitle>Title </FieldTitle>
                <FieldValue>{ title }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Name </FieldTitle>
                <FieldValue>{ name }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Version </FieldTitle>
                <FieldValue>{ version || 'No version set'}</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Description </FieldTitle>
                <FieldValue>{ description }</FieldValue>
              </ItemWrapper>
              {releaseDescription && (
                <ItemWrapper>
                  <FieldTitle>Release Description </FieldTitle>
                  <Toaster />
                  <EditableInput
                    value={releaseDescription}
                    onBlur={(newValue: string, resetToInitialValue: Function) => {
                      if (newValue.trim().length !== 0) {
                        const modifiedProgram = setReleaseDescription(program, newValue.trim())
                        setProgram(modifiedProgram) // Optimistic update and allows to be reverted when error'ed
                        updateProgram(modifiedProgram)
                      } else {
                        toast.error('Release Description cannot be empty', {
                          position: 'top-right',
                          style: {
                            borderRadius: 0
                          }
                        })
                        resetToInitialValue()
                      }
                    }}
                  />
                </ItemWrapper>)
              }
            </Row>
            <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
              <StyledSpan>Included ValueSet Groups</StyledSpan>
              <Button text='View ValueSets'
                onClick={() => router.push(`/programs/${id}/valuesets`)} // View Valuesets
              />
            </Row>
          </div>
      )}
      <ProgramDetailTable data={programAndGrouperInfo?.grouperData}/>
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default ProgramDetails
