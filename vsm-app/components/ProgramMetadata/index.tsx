import { useState, useEffect } from 'react'
import { Checkbox, FormControlLabel, Grid, Button } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import DateInput from '@/components/DateInput'
import {
  getReleaseDescription,
  getReleaseLabel,
  setReleaseDescription,
  missingFields,
  setTitleAndDerivedName
} from '@/helpers/libraryHelpers'
import { Form, ButtonContainer, buttonStyles } from './styles'

interface ProgramEditModalContentProps {
  handleSubmit: Function
  program: fhir4.Library
  editable: boolean
}

export const requiredFields = ['description', 'title']

interface OptionType {
  label: string
  value: string
}

interface ErrorMessages {
  [key: string]: string
}

const errorMessages: ErrorMessages = {
  title: 'Program title required',
  description: 'Program description required',
  startDate: 'Cannot be a past date'
}

const getExperimentalStatus = (program: fhir4.Library) => {
  return Boolean(program?.experimental)
}

// editable will be a prop
const ProgramMetadata = ({ handleSubmit, program, editable = true }: ProgramEditModalContentProps) => {
  const [editedProgram, setEditedProgram] = useState<fhir4.Library>(program)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExperimental, setIsExperimental] = useState(getExperimentalStatus(program))
  const [key, setKey] = useState(1)

  const initialErrorState = missingFields({ program, requiredFields })

  const [errorFields, setErrorFields] = useState(initialErrorState)
  const { version = '', title = '', description = '', status } = program
  const effectiveStartDate = editedProgram?.effectivePeriod?.start
  const releaseDescription = getReleaseDescription(program)
  const releaseLabel = getReleaseLabel(program)

  const getErrorText = (fieldName: string) => {
    if (errorFields.includes(fieldName)) {
      return errorMessages[fieldName]
    }
  }

  useEffect(() => {
    if(isExperimental !== program.experimental) {
      setFormTouched(true)
    }
  }, [isExperimental])

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
    fieldName: 'releaseDescription' | 'effectiveStartDate' | 'title' | keyof fhir4.Library
  ) => {
    let value

    if (typeof e === 'string' || e === null) {
      value = e
    } else {
      e?.preventDefault()
      value = e.target.value
    }
    setFormTouched(true)
    let newProgram: fhir4.Library

    if (fieldName === 'releaseDescription') {
      newProgram = setReleaseDescription(editedProgram, value)
    } else if (fieldName === 'effectiveStartDate') {
      newProgram = { ...editedProgram }
      if (value) {
        newProgram.effectivePeriod = { start: value }
      } else {
        delete newProgram.effectivePeriod
      }
    } else if (fieldName === 'title') {
      newProgram = setTitleAndDerivedName(editedProgram, value, 'DefaultProgramName')
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
    <Form error={Boolean(errorFields.length)} key={key}>
      <Grid container spacing={2} style={{ maxWidth: '700px' }}>
        <Grid item xs={12} md={4}>
          <SearchInput
            id="prog-title"
            label="Title"
            disabled={isSaving}
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
          {status === 'active' && (
            <SearchInput
              id="prog-release-label"
              label={`Release Label ${enableEditing ? `(read-only)` : ''}`}
              readonly={true}
              disabled={isSaving}
              defaultValue={releaseLabel}
              placeholder={'No release label set'}
            />
          )}
        </Grid>
        <Grid item xs={6}>
          <DateInput
            label={'Effective Start Date'}
            id="effectiveStartDate"
            defaultValue={effectiveStartDate}
            placeholder="No effective start date set"
            onChange={(newDate) => {
              const dateToSave = newDate?.isValid() ? newDate.format('YYYY-MM-DD') : null
              handleFieldChange(dateToSave, 'effectiveStartDate')
            }}
            disablePast={true}
            readonly={!editable || !enableEditing || isSaving}
            errorText={errorMessages.startDate}
          />
        </Grid>
        <Grid item xs={6}>
        <FormControlLabel
          label='Experimental?'
          id='experimental-indicator'
          control={
            <Checkbox
              readOnly={!editable || !enableEditing}
              disabled={!editable || !enableEditing || isSaving}
              defaultChecked={isExperimental}
              value={true}
              onChange={(e) =>  setIsExperimental(e.target.checked)}
            />
          }
        />
        </Grid>
        <Grid item xs={12}>
          <TextArea
            id="prog-desc"
            label="Description"
            readonly={!editable || !enableEditing}
            disabled={isSaving}
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
            disabled={isSaving}
            readonly={!editable || !enableEditing}
            defaultValue={releaseDescription}
            onChange={(event) => handleFieldChange(event, 'releaseDescription')}
            placeholder={'No release description set'}
          />
        </Grid>
        <Grid item xs={12}>
          {editable && !enableEditing && !formTouched ? (
            <ButtonContainer>
              <Button variant='contained' id={'edit-metadata'} type="button" onClick={() => setEnableEditing(true)} >Edit Metadata</Button>
            </ButtonContainer>
          ) : (
            <></>
          )}
          {editable && enableEditing ? (
            <ButtonContainer style={{ alignItems: 'flex-end' }}>
              <Button
                style={{ ...buttonStyles, backgroundColor: 'var(--neutral-300)' }}
                variant='contained'
                disabled={isSaving}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setKey((k) => k + 1)
                  setFormTouched(false)
                  setEditedProgram(program)
                  setEnableEditing(false)
                }}
                >Cancel</Button>
              <LoadingButton
                variant='contained'
                disabled={!formTouched || Boolean(errorFields.length)}
                id={'edit-metadata-save'}
                loading={isSaving}
                loadingPosition="start"
                type="submit"
                onClick={async (e) => {
                  e.preventDefault()
                  setIsSaving(true)
                  await handleSubmit({ program: editedProgram, isExperimental })
                  setEnableEditing(false)
                  setFormTouched(false)
                  setIsSaving(false)
                }}
              >
                Save Changes
              </LoadingButton>
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
