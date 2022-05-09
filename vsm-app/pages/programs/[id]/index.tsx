import React, { ChangeEvent, useState } from 'react'
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
  const [isEditing, setIsEditing] = useIsEditing()
  const [formTouched, setFormTouched] = useState(false)
  // to edit draft program
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>()

  const submitChanges = async (e: React.SyntheticEvent) => {
    const response = await fetch(`/api/programs/${id}`,{
      method: 'PUT',
      body: JSON.stringify(editedProgram)
    })
    
    // If there is an error in the PUT request to update the library, reset the program to default
    if (!response.ok) { setEditedProgram(programAndGrouperInfo.program as fhir4.Library) }
    handleEditButton(e)
    e.preventDefault()
  }

  const identifier = router.query.id as string
  const programAndGrouperInfo = useGetProgramDetails(identifier) as Result

  // early return if no data, id must exist if there's data
  if (!is.library(programAndGrouperInfo.program)) {
    return null
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
  const viewEditButton: boolean = status === 'draft'

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

  Modal.setAppElement('#__next');

  return (
    <Col>
      <Row style={{ justifyContent: 'space-between' }}>
        <PageTitle style={{ marginRight: '12px' }}>Program Details: <i style={{ textTransform: 'none'}}>{ id }</i></PageTitle>
        <Button
          style={{ marginBottom: '12px', width: '150px' }}
          text='Edit Program'
          onClick={handleEditButton}
        />
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
            <PageTitle>Edit Program Details</PageTitle> 
              <SearchInput id='prog-id' label='ID' def={id} disabled={true}/>
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
          {/* <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
            <StyledSpan>Included ValueSet Groups</StyledSpan>
            <Button text='Edit ValueSets' onClick={onClick}/>
          </Row> */}
        </div>
      </Modal>
      {false ? (
        null
      ) : (
          <div>
            <Row className='readonly-inputs'>
              <ItemWrapper>
                <FieldTitle>ID </FieldTitle>
                <FieldValue>{ id }</FieldValue>
              </ItemWrapper>
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
                <FieldValue>{ version }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Description </FieldTitle>
                <FieldValue>{ description }</FieldValue>
              </ItemWrapper>
            </Row>
            { viewEditButton ? <Button text={'Edit Program'} 
                style={{ marginBottom: '12px', width: '150px', backgroundColor: '' }} 
                onClick={handleEditButton}
              /> : null
            }
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

export default ProgramDetails
