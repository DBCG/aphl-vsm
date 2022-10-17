import React, { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Modal from 'react-modal'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails, Result } from '@/hooks/useGetProgramDetails'
import { useIsEditing } from '@/hooks/useIsEditing'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { is } from '@/helpers/is'
import { getSession, GetSessionParams } from 'next-auth/react'
import LoadingIndicator from '@/components/LoadingIndicator'
import { StatusProps } from '..'

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
  }
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

const ModalForm = styled.form`
  margin: 0 auto;
`

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
`

const IndicatorContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding-top: 100px;
`

const buttonStyles = {
  marginBottom: '12px',
  width: '150px',
  backgroundColor: 'darkOrange',
  marginTop: '20px',
  alignSelf: 'center'
}

export const FieldValue = styled.span``

const ProgramDetails: NextPage = () => {
  const router = useRouter()

  useEffect(() => {
    Modal.setAppElement('#__next');
  }, [])

  const [isEditing, setIsEditing] = useIsEditing()
  const [formTouched, setFormTouched] = useState(false)
  // to edit draft program
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>()

  const submitChanges = async (e: React.SyntheticEvent) => {
    handleEditButton(e)
    e.preventDefault()
    const response = await fetch(`/api/programs/${router.query.id}`, {
      method: 'PUT',
      body: JSON.stringify(editedProgram)
    })
    
    // If there is an error in the PUT request to update the library, reset the program to default
    if (!response.ok) {

      console.log('response was not ok: ', response)
      setEditedProgram(programAndGrouperInfo.program as fhir4.Library)
      // should handle if doesn't work
      return
    } else {
      // router.push(`/programs?new=updated`)
      const json = JSON.stringify(response)
      console.log('response: ', json)
    }
  }

  const identifier = router.query.id as string
  const programAndGrouperInfo = useGetProgramDetails(identifier) as Result

  // early return if no data, must be a library if there's data
  if (!is.library(programAndGrouperInfo.program)) {
    return (
      <IndicatorContainer>
        <LoadingIndicator size='large'/>
      </IndicatorContainer>
    )
  }

  const setProgram = (): fhir4.Library => {
    if (!editedProgram) {
      // @ts-expect-error
      return programAndGrouperInfo.program
    }
    return editedProgram
  }

  const program = setProgram()
  const { id='', name='', version='', title='', description='', status } = program

  const onClick = () => {
    router.push(`/programs/${id}/valuesets`)
  }

  const handleFieldChange = (e: React.ChangeEvent<Element>, fieldName: string) => {
    e.preventDefault()
    const target = e.target as HTMLInputElement;
    setFormTouched(true)
    const newProgram = { 
      ...program,
      [fieldName]: target.value
    }
    setEditedProgram(newProgram)
  }

  // when editing is live, work happens in the modal
  const handleEditButton = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setIsEditing()
  }

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
            onClick={handleEditButton}
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
            <ModalForm>
            <PageTitle>Edit Program Metadata</PageTitle> 
              <SearchInput id='prog-id' label='ID' minWidth={400} def={id} onChange={(event) => handleFieldChange(event, 'id')}/>
              <SearchInput id='prog-name' label='Name' minWidth={400} def={name} onChange={(event) => handleFieldChange(event, 'name')}/>
              <SearchInput id='prog-version' label='Version' def={version} onChange={(event) => handleFieldChange(event, 'version')}/>
              <SearchInput id='prog-title' label='Title' def={title} onChange={(event) => handleFieldChange(event, 'title')}/>
              <TextArea id='prog-desc' label='Description' minWidth={500} def={description} onChange={(event) => handleFieldChange(event, 'description')} />
              {formTouched && (
                <ButtonContainer>
                  <Button
                    style={buttonStyles}
                    text={'Save Changes'}
                    type='submit'
                    onClick={(e) => submitChanges(e)}
                  />
                </ButtonContainer>
              )}
            </ModalForm>
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
            </Row>
            <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
              <StyledSpan>Included ValueSet Groups</StyledSpan>
              <Button text='View ValueSets'
                onClick={onClick}
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
