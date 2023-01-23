import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import {
  getReleaseDescription,
  setReleaseDescription,
  progHasRequiredFields
} from '@/helpers/libraryHelpers'

const Form = styled.form`
 display: flex;
 flex-wrap: wrap;
 gap: 16px 24px;
 margin-bottom: 32px;
 padding: 16px;
 padding-bottom: 24px;
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

const Col = styled.div`
  display: flex;
  flex: 3;
  flex-direction: column;
`

const ButtonCol = styled(Col)`
  flex: 1;
`

const RequiredWarning = styled.p`
  color: red;
  font-style: italic;
  margin-top: 0;
  text-align: right;
`

const InputRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 12px;
`

const buttonStyles = {
  width: '150px',
  backgroundColor: '#ca9547',
  marginTop: '20px',
}

interface ProgramEditModalContentProps {
  handleSubmit: Function,
  program: fhir4.Library,
  editable: boolean
}

const requiredFields = [
  'name', 'description', 'title'
]

// editable will be a prop
const ProgramMetadata = ({ handleSubmit, program, editable=true }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)

  const initialErrorState = progHasRequiredFields({ program, requiredFields })
    ? null : { requiredFields: 'Please fill out required fields' }
  
  const [error, setError] = useState(initialErrorState)

  const { name='', version='', title='', description='' } = program
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
    if (!progHasRequiredFields({ program: newProgram, requiredFields })) {
      setError({ requiredFields: 'Please fill out required fields' })
    } else {
      setError(null)
    }
    setEditedProgram(newProgram)
  }

 return (
   <Form>
     <Col>
       <InputRow>
        <SearchInput
          id='prog-name'
          label='Name'
          readonly={!editable || !enableEditing}
          minWidth={200}
          def={name}
          onChange={(event) => handleFieldChange(event, 'name')}
          placeholder={'No program name set'}
          required={true}
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
          required={true}
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
            required={true}
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
       </InputRow>
     </Col>
     <ButtonCol>
      {(editable && !enableEditing && !formTouched) ? (
        <ButtonContainer>
          <Button
            style={{}}
            text={'Edit Metadata'}
            type='button'
            onClick={() => setEnableEditing(true)}
          />
        </ButtonContainer>
      ): <></>}
       {(editable && enableEditing) ? (
         <ButtonCol style={{ justifyContent: 'space-between' }}>
          <RequiredWarning>* field required</RequiredWarning>
          <ButtonContainer style={{ alignItems: 'flex-end' }}>
            <Button
              style={buttonStyles}
              text={'Cancel'}
              type='button'
               onClick={() => {
                setFormTouched(false)
                setEditedProgram(program)
              }}
            />
            <Button
              disabled={!formTouched || Boolean(error)}
              style={buttonStyles}
              text={'Save Changes'}
              type='submit'
              onClick={() => handleSubmit(editedProgram)}
            />
          </ButtonContainer>
         </ButtonCol>
      ): <></>}
    </ButtonCol>
</Form>
 )
}

export { ProgramMetadata }
