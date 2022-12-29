import {useEffect, useState} from 'react'
import styled from 'styled-components'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { PageTitle } from '@/components/Typography'
import { getReleaseDescription, setReleaseDescription } from '@/helpers/libraryHelpers'

const ModalForm = styled.form`
 display: flex;
 flex-wrap: wrap;
 gap: 16px 12px;
 margin-bottom: 32px;
 padding: 16px;
 background-color: var(--theme-100);
`

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  flex-basis: 100%;
  gap: 12px;
`

const TextAreaRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: 16px 12px;
`

const saveButtonStyles = {
  marginBottom: '12px',
  width: '150px',
  backgroundColor: '#ca9547',
  marginTop: '20px',
  alignSelf: 'center'
}

const cancelButtonStyles = {
  marginBottom: '12px',
  width: '150px',
  backgroundColor: '#ca9547',
  marginTop: '20px',
  alignSelf: 'center'
}

interface ProgramEditModalContentProps {
  handleSubmit: Function,
  program: fhir4.Library
}

const ProgramEditModalContent = ({ handleSubmit, program }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)

  const { id = '', name = '', version = '', title = '', description = '' } = program

  const releaseDescription = getReleaseDescription(program)

  const handleFieldChange = (e: React.ChangeEvent<Element>, fieldName: string) => {
    e.preventDefault()
    const target = e.target as HTMLInputElement;
    setFormTouched(true)
    let newProgram
    if (fieldName === 'releaseDescription') {
      newProgram = setReleaseDescription(program, target.value)
    } else {
      newProgram = { 
        ...editedProgram,
        [fieldName]: target.value
      }
    }
    setEditedProgram(newProgram)
  }

  useEffect(() => {
    const fieldsToCheck = []
  }, [editedProgram])

 return (
  <ModalForm>
    {/* <PageTitle>Edit Program Metadata</PageTitle>  */}
    <SearchInput id='prog-name' label='Name' minWidth={200} def={name} onChange={(event) => handleFieldChange(event, 'name')}/>
    <SearchInput id='prog-version' label='Version' minWidth={200} def={version} onChange={(event) => handleFieldChange(event, 'version')}/>
    <SearchInput id='prog-title' label='Title' minWidth={200} def={title} onChange={(event) => handleFieldChange(event, 'title')}/>
    <TextArea id='prog-desc' label='Description' minWidth={200} def={description} onChange={(event) => handleFieldChange(event, 'description')} />
    <TextArea id='prog-release-desc' label='Release Description' minWidth={200} def={releaseDescription} onChange={(event) => handleFieldChange(event, 'releaseDescription')} />
    {formTouched && (
      <ButtonContainer>
        <Button
          style={saveButtonStyles}
          text={'Save Changes'}
          type='submit'
          onClick={() => handleSubmit(editedProgram)}
        />
      </ButtonContainer>
    )}
</ModalForm>
 )
}

export default ProgramEditModalContent


// editable will be a prop
const ProgramMetadata = ({ handleSubmit, program, editable=true }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)

  const { id='', name='', version='', title='', description='' } = program
  const releaseDescription = getReleaseDescription(program)

  const handleFieldChange = (e: React.ChangeEvent<Element>, fieldName: string) => {
    e.preventDefault()
    const target = e.target as HTMLInputElement;
    setFormTouched(true)
    let newProgram
    if (fieldName === 'releaseDescription') {
      newProgram = setReleaseDescription(program, target.value)
    } else {
      newProgram = { 
        ...editedProgram,
        [fieldName]: target.value
      }
    }
    setEditedProgram(newProgram)
  }

 return (
   <ModalForm>
     {editable && !enableEditing && !formTouched && (
       <ButtonContainer>
        <Button
          text={'Edit Metadata'}
          type='button'
          onClick={() => setEnableEditing(true)}
        />
       </ButtonContainer>
     )}
     <SearchInput
       id='prog-name'
       label='Name'
       readonly={!editable || !enableEditing}
       minWidth={200}
       def={name}
       onChange={(event) => handleFieldChange(event, 'name')}
       placeholder={'No program name set'}
     />
     <SearchInput
       id='prog-version'
       label='Version'
       readonly={!editable || !enableEditing}
       minWidth={200}
       def={version}
       onChange={(event) => handleFieldChange(event, 'version')}
       placeholder={'No program version set'}
     />
     <SearchInput
       id='prog-title'
       label='Title'
       readonly={!editable || !enableEditing}
       minWidth={200}
       def={title}
       onChange={(event) => handleFieldChange(event, 'title')}
       placeholder={'No program title set'}
     />
     <TextAreaRow>
      <TextArea
        id='prog-desc'
        label='Description'
        readonly={!editable || !enableEditing}
        minWidth={200}
        def={description}
        onChange={(event) => handleFieldChange(event, 'description')}
        placeholder={'No program description set'}
        style={{ flexBasis: '100%', maxWidth: '624px' }}
      />
      <TextArea
        id='prog-release-desc'
        label='Release Description'
        readonly={!editable || !enableEditing}
        minWidth={200}
        def={releaseDescription}
        onChange={(event) => handleFieldChange(event, 'releaseDescription')}
        placeholder={'No release description set'}
        style={{ flexBasis: '100%', maxWidth: '624px' }}
      />
     </TextAreaRow>
    {editable && (
      <ButtonContainer>
        <Button
          style={cancelButtonStyles}
          text={'Cancel'}
          type='button'
          onClick={() => handleSubmit(editedProgram)}
        />
         <Button
          disabled={!formTouched}
          style={saveButtonStyles}
          text={'Save Changes'}
          type='submit'
          onClick={() => handleSubmit(editedProgram)}
        />
      </ButtonContainer>
    )}
</ModalForm>
 )
}

export { ProgramMetadata }
