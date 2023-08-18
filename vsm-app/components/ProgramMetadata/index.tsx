import { useState } from 'react'
import Select, { Options } from 'react-select'
import { Grid } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import DateInput from '@/components/DateInput'
import {
  getReleaseDescription,
  getReleaseLabel,
  setReleaseDescription,
  missingFields,
  setVSPriorityUsageContext,
  getVSPriorityUsageContext,
  USHealthVSPriority
} from '@/helpers/libraryHelpers'
import { Form, ButtonContainer, buttonStyles } from './styles'

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

interface ErrorMessages {
  [key: string]: string
}

const errorMessages: ErrorMessages = {
  name: 'Program name required',
  title: 'Program title required',
  description: 'Program description required'
}

// editable will be a prop
const ProgramMetadata = ({ handleSubmit, program, editable = true }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const initialErrorState = missingFields({ program, requiredFields })

  const [errorFields, setErrorFields] = useState(initialErrorState)
  const { name = '', version = '', title = '', description = '' } = program
  const effectiveStartDate = editedProgram?.effectivePeriod?.start
  const releaseDescription = getReleaseDescription(program)
  const releaseLabel = getReleaseLabel(program)
  const getErrorText = (fieldName: string) => {
    if (errorFields.includes(fieldName)) {
      return errorMessages[fieldName]
    }
  }

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, fieldName: string) => {
    let value

    if (typeof e === 'string' || e === null) {
      value = e
    } else {
      e?.preventDefault()
      value = e.target.value
    }
    setFormTouched(true)
    let newProgram

    if (fieldName === 'releaseDescription') {
      newProgram = setReleaseDescription(editedProgram, value)
    } else if (fieldName === 'effectiveStartDate') {
      newProgram = { ...editedProgram }
      if (value) {
        newProgram.effectivePeriod = { start: value }
      } else {
        delete newProgram.effectivePeriod
      }
    } else {
      newProgram = {
        ...editedProgram,
        [fieldName]: value
      }
    }

    const requiredFieldsMissing = missingFields({ program: newProgram, requiredFields })
    setErrorFields(requiredFieldsMissing)

    setEditedProgram(newProgram)
  }

  return (
    <Form error={Boolean(errorFields.length)}>
      <Grid container spacing={2} style={{ maxWidth: '700px' }}>
        <Grid item xs={12} md={4}>
          <SearchInput
            id="prog-name"
            label="Name"
            readonly={!editable || !enableEditing}
            defaultValue={name}
            onChange={(event) => handleFieldChange(event, 'name')}
            placeholder={'No program name set'}
            required={true}
            errorMessage={getErrorText('name')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SearchInput
            id="prog-title"
            label="Title"
            readonly={!editable || !enableEditing}
            defaultValue={title}
            onChange={(event) => handleFieldChange(event, 'title')}
            placeholder={'No program title set'}
            required={true}
            errorMessage={getErrorText('title')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SearchInput
            id="prog-version"
            label={`Version ${enableEditing ? `(read-only)` : ''}`}
            readonly={true}
            defaultValue={version}
            onChange={(event) => handleFieldChange(event, 'version')}
            placeholder={'No program version set'}
          />
        </Grid>
        <Grid item xs={12}>
          <SearchInput
            id="prog-release-label"
            label={`Release Label ${enableEditing ? `(read-only)` : ''}`}
            readonly={true}
            defaultValue={releaseLabel}
            placeholder={'No release label set'}
          />
        </Grid>
        <Grid item xs={12}>
          <DateInput
            label={'Effective Start Date'}
            id="effectiveStartDate"
            defaultValue={effectiveStartDate}
            placeholder="No effective start date set"
            onChange={(newDate) => {
              const dateToSave = newDate?.isValid() ? newDate.format('YYYY-MM-DD') : null
              handleFieldChange(dateToSave, 'effectiveStartDate')
            }}
            readonly={!editable || !enableEditing}
          />
        </Grid>
        <Grid item xs={12}>
          <TextArea
            id="prog-desc"
            label="Description"
            readonly={!editable || !enableEditing}
            defaultValue={description}
            onChange={(event) => handleFieldChange(event, 'description')}
            placeholder={'No program description set'}
            required={true}
            errorMessage={getErrorText('description')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextArea
            id="prog-release-desc"
            label="Release Description"
            readonly={!editable || !enableEditing}
            defaultValue={releaseDescription}
            onChange={(event) => handleFieldChange(event, 'releaseDescription')}
            placeholder={'No release description set'}
          />
        </Grid>
        <Grid item xs={12}>
          {enableEditing ? (
            <div>
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
              defaultValue={priorityLevelOptions.find((i) => i.value === getVSPriorityUsageContext(editedProgram))?.label}
              placeholder={'No Priority set'}
              style={{ flexBasis: '100%', maxWidth: '624px' }}
            />
          )}
        </Grid>
        <Grid item xs={12}>
          {editable && !enableEditing && !formTouched ? (
            <ButtonContainer>
              <Button text={'Edit Metadata'} id={'edit-metadata'} type="button" onClick={() => setEnableEditing(true)} />
            </ButtonContainer>
          ) : (
            <></>
          )}
          {editable && enableEditing ? (
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
                disabled={!formTouched || Boolean(errorFields.length)}
                id={'edit-metadata-save'}
                style={{
                  ...buttonStyles,
                  backgroundColor: 'var(--theme-300)'
                }}
                loading={isSaving}
                text={'Save Changes'}
                type="submit"
                onClick={async (e) => {
                  setIsSaving(true)
                  e.preventDefault()
                  await handleSubmit(editedProgram)
                  setEnableEditing(false)
                  setFormTouched(false)
                  setIsSaving(false)
                }}
              />
            </ButtonContainer>
          ) : (
            <></>
          )}
        </Grid>
      </Grid>
    </Form>
  )
}

export default ProgramMetadata
