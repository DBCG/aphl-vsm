import {useState} from 'react'
import styled from 'styled-components'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { PageTitle } from '@/components/Typography'

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

  const { id='', name='', version='', title='', description='', status } = program

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

 return (
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
          onClick={() => handleSubmit(editedProgram)}
        />
      </ButtonContainer>
    )}
</ModalForm>
 )
}

export default ProgramEditModalContent