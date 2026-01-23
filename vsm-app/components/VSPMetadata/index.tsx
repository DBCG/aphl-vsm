import { useState, useEffect } from 'react'
import { Checkbox, FormControlLabel, Grid, Button } from '@mui/material'
import { LoadingButton } from '@mui/lab'
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

interface VSPMetadataProps {
  handleSubmit: Function
  vsp: fhir4.Library
  editable: boolean
}

export const requiredFields = ['description', 'title']

interface ErrorMessages {
  [key: string]: string
}

const errorMessages: ErrorMessages = {
  title: 'VSP title required',
  description: 'VSP description required',
  startDate: 'Cannot be a past date'
}

const getExperimentalStatus = (vsp: fhir4.Library) => {
  return Boolean(vsp?.experimental)
}

const VSPMetadata = ({ handleSubmit, vsp, editable = true }: VSPMetadataProps) => {
  const [editedVSP, setEditedVSP] = useState<fhir4.Library>(vsp)
  const [formTouched, setFormTouched] = useState(false)
  const [enableEditing, setEnableEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExperimental, setIsExperimental] = useState(getExperimentalStatus(vsp))
  const [key, setKey] = useState(1)

  const initialErrorState = missingFields({ program: vsp, requiredFields })

  const [errorFields, setErrorFields] = useState(initialErrorState)
  const { version = '', title = '', description = '', status } = vsp
  const effectiveStartDate = editedVSP?.effectivePeriod?.start
  const releaseDescription = getReleaseDescription(vsp)
  const releaseLabel = getReleaseLabel(vsp)

  const getErrorText = (fieldName: string) => {
    if (errorFields.includes(fieldName)) {
      return errorMessages[fieldName]
    }
  }

  useEffect(() => {
    if (isExperimental !== vsp.experimental) {
      setFormTouched(true)
    }
  }, [isExperimental, vsp.experimental])

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
    let newVSP: fhir4.Library

    if (fieldName === 'releaseDescription') {
      newVSP = setReleaseDescription(editedVSP, value)
    } else if (fieldName === 'effectiveStartDate') {
      newVSP = { ...editedVSP }
      if (value) {
        newVSP.effectivePeriod = { start: value }
      } else {
        delete newVSP.effectivePeriod
      }
    } else if (fieldName === 'title') {
      newVSP = setTitleAndDerivedName(editedVSP, value, 'DefaultVSPName')
    } else {
      newVSP = {
        ...editedVSP,
        [fieldName]: value
      }
    }

    const requiredFieldsMissing = missingFields({ program: newVSP, requiredFields })
    setErrorFields(requiredFieldsMissing)

    setEditedVSP(newVSP)
  }

  return (
    <Form error={Boolean(errorFields.length)} style={{ padding: '1.8rem' }} key={key}>
      <Grid container spacing={2} style={{ maxWidth: '700px' }}>
        <Grid item xs={12} md={4}>
          <TextArea
            id="vsp-title"
            label="Title"
            disabled={isSaving}
            readonly={!editable || !enableEditing}
            defaultValue={title}
            onChange={(event) => handleFieldChange(event, 'title')}
            placeholder={'No VSP title set'}
            required={true}
            errorMessage={getErrorText('title')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextArea
            id="vsp-version"
            label={`Version ${enableEditing ? `(read-only)` : ''}`}
            readonly={true}
            defaultValue={version}
            onChange={(event) => handleFieldChange(event, 'version')}
            placeholder={'No VSP version set'}
          />
        </Grid>
        <Grid item xs={12}>
          {status === 'active' && (
            <TextArea
              id="vsp-release-label"
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
            label="Experimental?"
            id="experimental-indicator"
            control={
              <Checkbox
                readOnly={!editable || !enableEditing}
                disabled={!editable || !enableEditing || isSaving}
                defaultChecked={isExperimental}
                value={true}
                onChange={(e) => setIsExperimental(e.target.checked)}
              />
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextArea
            id="vsp-desc"
            label="Description"
            multiline={true}
            readonly={!editable || !enableEditing}
            disabled={isSaving}
            defaultValue={description}
            onChange={(event) => handleFieldChange(event, 'description')}
            placeholder={'No VSP description set'}
            required={true}
            errorMessage={getErrorText('description')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextArea
            id="vsp-release-desc"
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
              <Button variant="contained" id={'edit-metadata'} type="button" onClick={() => setEnableEditing(true)}>
                Edit Metadata
              </Button>
            </ButtonContainer>
          ) : (
            <></>
          )}
          {editable && enableEditing ? (
            <ButtonContainer style={{ alignItems: 'flex-end' }}>
              <Button
                style={{ ...buttonStyles, backgroundColor: 'var(--neutral-300)' }}
                variant="contained"
                disabled={isSaving}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setKey((k) => k + 1)
                  setFormTouched(false)
                  setEditedVSP(vsp)
                  setEnableEditing(false)
                }}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="contained"
                disabled={!formTouched || Boolean(errorFields.length)}
                id={'edit-metadata-save'}
                loading={isSaving}
                loadingPosition="start"
                type="submit"
                onClick={async (e) => {
                  e.preventDefault()
                  setIsSaving(true)
                  await handleSubmit({ program: editedVSP, isExperimental })
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

export default VSPMetadata
