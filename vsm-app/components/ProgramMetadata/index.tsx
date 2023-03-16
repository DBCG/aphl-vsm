import { useState } from 'react'
import Select, { OptionsOrGroups } from 'react-select'
import { Label } from '../SearchInput'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { getReleaseDescription, setReleaseDescription, progHasRequiredFields, setVSPriorityUsageContext, getVSPriorityUsageContext } from '@/helpers/libraryHelpers'
import {
  Form,
  ButtonContainer,
  TextAreaRow,
  Col,
  ButtonCol,
  RequiredWarning,
  InputRow,
  buttonStyles
} from './styles'

interface ProgramEditModalContentProps {
  handleSubmit: Function
  program: fhir4.Library
  editable: boolean
}

const requiredFields = ['name', 'description', 'title']



interface OptionType { 
  label: string, value: string
}

const emergentConditionOptions: OptionsOrGroups<string, any> = [
  {label: 'Emergent', value: 'emergent'},
  {label: 'Priority', value: 'priority'},
  {label: 'Routine', value: 'routine' }
]

// editable will be a prop
const ProgramMetadata = ({ handleSubmit, program, editable = true }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)

  const initialErrorState = progHasRequiredFields({ program, requiredFields })
    ? null
    : { requiredFields: 'Please fill out required fields' }

  const [error, setError] = useState(initialErrorState)

  const { name = '', version = '', title = '', description = '' } = program
  const releaseDescription = getReleaseDescription(program)

  const handleFieldChange = (e: React.ChangeEvent<Element>, fieldName: string) => {
    e.preventDefault()
    const target = e.target as HTMLInputElement
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
            id="prog-name"
            label="Name"
            readonly={!editable || !enableEditing}
            minWidth={200}
            def={name}
            onChange={(event) => handleFieldChange(event, 'name')}
            placeholder={'No program name set'}
            required={true}
          />
          <SearchInput
            id="prog-version"
            label="Version"
            readonly={!editable || !enableEditing}
            minWidth={200}
            def={version}
            onChange={(event) => handleFieldChange(event, 'version')}
            placeholder={'No program version set'}
          />
          <SearchInput
            id="prog-title"
            label="Title"
            readonly={!editable || !enableEditing}
            minWidth={200}
            def={title}
            onChange={(event) => handleFieldChange(event, 'title')}
            placeholder={'No program title set'}
            required={true}
          />
          <TextAreaRow>
            <TextArea
              id="prog-desc"
              label="Description"
              readonly={!editable || !enableEditing}
              minWidth={200}
              def={description}
              onChange={(event) => handleFieldChange(event, 'description')}
              placeholder={'No program description set'}
              style={{ flexBasis: '100%', maxWidth: '624px' }}
              required={true}
            />
            <TextArea
              id="prog-release-desc"
              label="Release Description"
              readonly={!editable || !enableEditing}
              minWidth={200}
              def={releaseDescription}
              onChange={(event) => handleFieldChange(event, 'releaseDescription')}
              placeholder={'No release description set'}
              style={{ flexBasis: '100%', maxWidth: '624px' }}
            />
            {enableEditing ? (
              <div style={{
                flexBasis: '100%',
                maxWidth: '624px'
              }}>
              <Label id='emergent-conditions-selector-label'label="Emergent Condition" required={true} readonly={true} />
              <Select
                placeholder="Select Emergent Condition"
                classNamePrefix="emergent-condition-selector"
                inputId="emergent-conditions-selector"
                defaultValue={emergentConditionOptions.find((i: any) => i.value === getVSPriorityUsageContext(editedProgram))}
                instanceId="emergent-conditions-selector"
                options={emergentConditionOptions}
                onChange={(e) => {
                  const updatedProgram = setVSPriorityUsageContext(editedProgram, e?.value)
                  setFormTouched(true)
                  setEditedProgram(updatedProgram)
                }}
              />
              </div>) : (
              <TextArea
                id="emergent-condition"
                label="Emergent Condition"
                readonly={true}
                minWidth={200}
                def={getVSPriorityUsageContext(editedProgram)}
                placeholder={'No Condition set'}
                style={{ flexBasis: '100%', maxWidth: '624px' }}
              />)
            }
          </TextAreaRow>
        </InputRow>
      </Col>
      <ButtonCol>
        {editable && !enableEditing && !formTouched ? (
          <ButtonContainer>
            <Button style={{}} text={'Edit Metadata'} type="button" onClick={() => setEnableEditing(true)} />
          </ButtonContainer>
        ) : (
          <></>
        )}
        {editable && enableEditing ? (
          <ButtonCol style={{ justifyContent: 'space-between' }}>
            <RequiredWarning>* field required</RequiredWarning>
            <ButtonContainer style={{ alignItems: 'flex-end' }}>
              <Button
                style={buttonStyles}
                text={'Cancel'}
                type="button"
                onClick={() => {
                  setFormTouched(false)
                  setEditedProgram(program)
                }}
              />
              <Button
                disabled={!formTouched || Boolean(error)}
                style={buttonStyles}
                text={'Save Changes'}
                type="submit"
                onClick={() => handleSubmit(editedProgram)}
              />
            </ButtonContainer>
          </ButtonCol>
        ) : (
          <></>
        )}
      </ButtonCol>
    </Form>
  )
}

export default ProgramMetadata
