import { useState } from 'react'
import Select, { Options } from 'react-select'
import { InputLabel } from '@/components/InputLabel'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import DateInput from '@/components/DateInput'
import {
  getReleaseDescription,
  setReleaseDescription,
  progHasRequiredFields,
  setVSPriorityUsageContext,
  getVSPriorityUsageContext,
  USHealthVSPriority
} from '@/helpers/libraryHelpers'
import { Form, ButtonContainer, TextAreaRow, Col, ButtonCol, RequiredWarning, buttonStyles } from './styles'
import { InputRow } from '@/styles'

interface ProgramEditModalContentProps {
  handleSubmit: Function
  program: fhir4.Library
  editable: boolean
}

const requiredFields = ['name', 'description', 'title']

interface OptionType {
  label: string
  value: string
}

const priorityLevelOptions: Options<OptionType> = [
  { label: 'Emergent', value: 'emergent' },
  { label: 'Priority', value: 'priority' },
  { label: 'Routine', value: 'routine' }
] as const

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
  const effectiveStartDate = program.effectivePeriod?.start
  const releaseDescription = getReleaseDescription(program)

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, fieldName: string) => {
    let value

    if (typeof e === 'string') {
      value = e
    } else {
      e.preventDefault()
      value = e.target.value
    }
    setFormTouched(true)
    let newProgram
    if (fieldName === 'releaseDescription') {
      newProgram = setReleaseDescription(editedProgram, value)
    } else if (fieldName === 'effectiveStartDate') {
      newProgram = {
        ...editedProgram,
        effectivePeriod: {
          start: value,
          end: editedProgram.effectivePeriod?.end
        }
      }
    } else {
      newProgram = {
        ...editedProgram,
        [fieldName]: value
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
          <DateInput
            label={'Effective Start Date'}
            id="effectiveStartDate"
            def={effectiveStartDate}
            placeholder="No effective start date set"
            onChange={(newDate) => {
              newDate && handleFieldChange(newDate.format('YYYY-MM-DD'), 'effectiveStartDate')
            }}
            readonly={!editable || !enableEditing}
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
              <div
                style={{
                  flexBasis: '100%',
                  maxWidth: '624px'
                }}
              >
                <InputLabel id="priority-level-selector-label" label="Priority Level" required={true} readonly={true} />
                <Select
                  placeholder="Select Priority Level"
                  classNamePrefix="priority-level-selector"
                  inputId="priority-level-selector"
                  defaultValue={priorityLevelOptions.find((i: any) => i.value === getVSPriorityUsageContext(editedProgram))}
                  instanceId="priority-level-selector"
                  options={priorityLevelOptions}
                  onChange={(e) => {
                    const newPriority = e?.value as USHealthVSPriority
                    const updatedProgram = setVSPriorityUsageContext(editedProgram, newPriority) as fhir4.Library
                    setFormTouched(true)
                    setEditedProgram(updatedProgram)
                  }}
                />
              </div>
            ) : (
              <TextArea
                id="priority-level"
                label="Priority Level"
                readonly={true}
                minWidth={200}
                def={priorityLevelOptions.find((i) => i.value === getVSPriorityUsageContext(editedProgram))?.label}
                placeholder={'No Priority set'}
                style={{ flexBasis: '100%', maxWidth: '624px' }}
              />
            )}
          </TextAreaRow>
        </InputRow>
      </Col>
      <ButtonCol>
        {editable && !enableEditing && !formTouched ? (
          <ButtonContainer>
            <Button text={'Edit Metadata'} id={'edit-metadata'} type="button" onClick={() => setEnableEditing(true)} />
          </ButtonContainer>
        ) : (
          <></>
        )}
        {editable && enableEditing ? (
          <ButtonCol style={{ justifyContent: 'space-between' }}>
            <RequiredWarning>* field required</RequiredWarning>
            <ButtonContainer style={{ alignItems: 'flex-end' }}>
              <Button
                style={{ ...buttonStyles, backgroundColor: 'var(--neutral-300)' }}
                text={'Cancel'}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setFormTouched(false)
                  setEditedProgram(program)
                  setEnableEditing(false)
                }}
              />

              <Button
                disabled={!formTouched || Boolean(error)}
                id={'edit-metadata-save'}
                style={{
                  ...buttonStyles,
                  backgroundColor: 'var(--theme-300)'
                }}
                text={'Save Changes'}
                type="submit"
                onClick={async (e) => {
                  e.preventDefault()
                  await handleSubmit(editedProgram)
                  setEnableEditing(false)
                  setFormTouched(false)
                }}
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
