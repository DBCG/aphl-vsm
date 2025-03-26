import { useState, useEffect, SetStateAction, Dispatch } from 'react'
import { Box, Typography, Grid, FormControl, Button  } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton';
import { toast } from 'react-toastify'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from './LoadingIndicator'
import { ProgramDetails } from '@/types/grouperTypes'
import { InputContainer, ButtonContainer } from '@/styles'
import { TextArea } from '@/components/TextArea'
import { getOid, isVSMOwnedVSet } from '@/helpers/valueSetHelpers'
import ValueSetDetailsTables from './ValueSetDetailsTables'
import { getKeywords } from '@/helpers/valueSetHelpers'
import { StatusChip } from './data-display/Chips'

const maxFormWidth = '1000px'

interface StringMap {
  [key: string]: string | undefined
}

interface ValueSetContentsProps {
  programAndGrouperInfo: ProgramDetails
  isGrouperValueSet: boolean
  setToggleUpdateData: Dispatch<SetStateAction<boolean>>
  valueSet: fhir4.ValueSet
  programId: string
  enableEditing: boolean
  isDraftProgram: boolean
}

interface Error {
  type: string
  message: string
}

interface MetadataResult {
  version?: string
  description?: string
  publisher?: string
  purpose?: string
  author?: string
  name?: string
  title?: string
}

export default function ValueSetContents({
  programAndGrouperInfo,
  setToggleUpdateData,
  isGrouperValueSet,
  valueSet,
  isDraftProgram = false,
  programId,
  enableEditing
}: ValueSetContentsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentValueSet, setCurrentValueSet] = useState(valueSet)
  const [loading, setLoading] = useState(false)

  const isOwnedByVSM = isVSMOwnedVSet(valueSet)

  const {
    version: defaultGrouperVersion,
    description: defaultGrouperDescription,
    publisher: defaultGrouperPublisher,
    purpose: defaultGrouperPurpose,
    title: defaultGrouperTitle
  } = valueSet

  // could be multiple authors maybe?
  const defaultGrouperAuthor =
    valueSet?.extension?.find((ext) => ext?.url?.endsWith('/StructureDefinition/valueset-author'))?.valueContactDetail?.name || ''

  const keywords = getKeywords(valueSet).map((i) => i?.valueString)

  const [grouperDescription, setGrouperDescription] = useState(defaultGrouperDescription)
  const [grouperPurpose, setGrouperPurpose] = useState(defaultGrouperPurpose)
  const [grouperPublisher, setGrouperPublisher] = useState(defaultGrouperPublisher)
  const [grouperAuthor, setGrouperAuthor] = useState(defaultGrouperAuthor)
  const [grouperTitle, setGrouperTitle] = useState(defaultGrouperTitle)
  const [changedMetadataItems, setChangedMetadataItems] = useState({})

  useEffect(() => {
    const metadataItemsChanged: MetadataResult = {}

    if (defaultGrouperDescription?.trim() !== grouperDescription?.trim()) {
      metadataItemsChanged.description = grouperDescription?.trim()
    }
    if (defaultGrouperPurpose?.trim() !== grouperPurpose?.trim()) {
      metadataItemsChanged.purpose = grouperPurpose?.trim()
    }
    if (defaultGrouperPublisher?.trim() !== grouperPublisher?.trim()) {
      metadataItemsChanged.publisher = grouperPublisher?.trim()
    }
    if (defaultGrouperAuthor?.trim() !== grouperAuthor?.trim()) {
      metadataItemsChanged.author = grouperAuthor?.trim()
    }
    if (defaultGrouperTitle?.trim() !== grouperTitle?.trim()) {
      metadataItemsChanged.title = grouperTitle?.trim()
    }

    setChangedMetadataItems(metadataItemsChanged)
  }, [
    grouperTitle,
    grouperDescription,
    grouperPurpose,
    grouperPublisher,
    grouperAuthor,
    defaultGrouperVersion,
    defaultGrouperDescription,
    defaultGrouperPurpose,
    defaultGrouperPublisher,
    defaultGrouperAuthor
  ])

  const [error, setError] = useState<null | Error>(null)

  if (valueSet == null || programAndGrouperInfo?.grouperLibrary == null) {
    return <LoadingIndicator />
  }

  const resetValues = () => {
    setGrouperDescription(defaultGrouperDescription)
    setGrouperPurpose(defaultGrouperPurpose)
    setGrouperPublisher(defaultGrouperPublisher)
    setGrouperAuthor(defaultGrouperAuthor)
    setGrouperTitle(defaultGrouperTitle)
  }

  const submitGrouperUpdates = async () => {
    setLoading(true)
    const metadataItems: StringMap = {
      description: grouperDescription?.trim(),
      purpose: grouperPurpose?.trim(),
      publisher: grouperPublisher?.trim(),
      author: grouperAuthor.trim()
    }

    // check that no fields empty
    const fieldIsEmpty = Object.values(metadataItems).find((val) => !Boolean(val))

    if (fieldIsEmpty) {
      setError({
        type: 'no-data',
        message: 'All fields required.'
      })
      setLoading(false)
      return
    }

    // check that there are fields to change
    if (!Object.keys(changedMetadataItems).length) {
      setError({
        type: 'no-fields-changed',
        message: 'No fields were changed, update cancelled.'
      })
      setLoading(false)
      return
    }

    const body = {
      metadata: changedMetadataItems,
      originalGrouperVersion: defaultGrouperVersion,
      grouperId: valueSet.id
    }

    const submitResponse = await fetch(`/api/programs/${programId}/grouper/valueset`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    if (submitResponse.ok) {
      setToggleUpdateData((t: boolean) => !t)
    } else {
      toast.error('Failed to update grouper')
    }
    setLoading(false)
    setIsEditing(false)
  }

  const programUrl = programAndGrouperInfo?.program?.url
  const programVersion = programAndGrouperInfo?.program?.version
  return (
    <Box>
      <Box sx={{ width: '100%', backgroundColor: 'var(--theme-100)', padding: '24px', maxWidth: maxFormWidth }}>
        <FormControl>
          <Grid item xs={12} sm={2}>
            <Grid container justifyContent='flex-end' alignItems='flex-start' spacing={2}>
                <Typography
                  sx={{
                    background: isGrouperValueSet ? 'var(--accent)' : 'var(--theme-300)',
                    color: 'white',
                    padding: '4px 10px',
                    textAlign: 'center',
                    borderRadius: '8px'
                  }}
                >
                  {isGrouperValueSet ? 'Grouper' : 'Leaf'}
                </Typography>
              </Grid>
            <Grid item xs={12} sm={10}>
              <PageTitle style={{ marginBottom: '1rem' }} id={'page-title'}>{currentValueSet.title}</PageTitle>
            </Grid>
          </Grid>
          <InputContainer>
            <Grid container justifyContent="flex-end">
              {isDraftProgram && (
                <StatusChip label='draft' experimental={Boolean(programAndGrouperInfo?.program?.experimental)}/>
              )}
            </Grid>
            <Grid container alignItems="flex-start" spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextArea
                  id="prog-id"
                  label="Program ID"
                  readonly={true}
                  defaultValue={programAndGrouperInfo?.program?.id || 'No ID found'}
                  placeholder={'No valueset id set'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextArea
                  id="prog-name"
                  label="Program Name"
                  readonly={true}
                  defaultValue={programAndGrouperInfo?.program?.name || 'No name found'}
                  placeholder={'No valueset id set'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextArea
                  id="prog-version"
                  label="Program Version"
                  readonly={true}
                  defaultValue={programVersion}
                  placeholder={'No program version set'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextArea
                  id="prog-url"
                  label="Program URL"
                  readonly={true}
                  defaultValue={programUrl}
                  placeholder={'No program canonical set'}
                />
              </Grid>
              {keywords.length > 0 && (
                <Grid item xs={12}>
                  <TextArea id="keywords" label="Keywords" readonly={true} defaultValue={keywords.join(', ')} />
                </Grid>
              )}
            </Grid>
          </InputContainer>
          <InputContainer>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextArea
                  id="vs-version"
                  label={isGrouperValueSet ? 'Grouper Version' : 'Valueset Version'}
                  readonly={true}
                  defaultValue={defaultGrouperVersion}
                  placeholder={`No ${isGrouperValueSet ? 'Grouper' : 'Valueset'} version set`}
                />
              </Grid>
              <Grid item xs={12}>
                <TextArea
                  id="vs-url"
                  label={'URL'}
                  readonly={true}
                  defaultValue={currentValueSet.url}
                  placeholder={`No ${isGrouperValueSet ? 'Grouper' : 'Valueset'} url set`}
                />
              </Grid>
              <Grid item xs={12}>
                <TextArea
                  id="vs-title"
                  label={isGrouperValueSet ? 'Grouper Title' : 'Valueset Title'}
                  readonly={!isEditing}
                  disabled={isSaving}
                  value={grouperTitle}
                  placeholder={`No ${isGrouperValueSet ? 'Grouper' : 'Valueset'} title set`}
                  onChange={(e) => setGrouperTitle(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                {!isOwnedByVSM && (
                  <TextArea
                    id="vs-oid"
                    label={'OID'}
                    readonly={true}
                    value={getOid(currentValueSet)}
                    placeholder={'No valueset oid was set'}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={12} md={6}>
                <TextArea
                  id="vs-publisher"
                  label="Publisher"
                  disabled={isSaving}
                  readonly={!isEditing}
                  value={grouperPublisher}
                  placeholder={'No valueset publisher set'}
                  onChange={(e) => setGrouperPublisher(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextArea
                  id="vs-author"
                  label="Author"
                  disabled={isSaving}
                  readonly={!isEditing}
                  value={grouperAuthor}
                  placeholder={'No valueset author set'}
                  onChange={(e) => setGrouperAuthor(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextArea
                  id="vs-purpose"
                  label="Purpose"
                  disabled={isSaving}
                  readonly={!isEditing}
                  value={grouperPurpose}
                  placeholder={'No valueset purpose set'}
                  onChange={(e) => setGrouperPurpose(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextArea
                  id="vs-description"
                  label="Description"
                  disabled={isSaving}
                  multiline={true}
                  readonly={!isEditing}
                  value={grouperDescription}
                  placeholder={'No valueset description set'}
                  onChange={(e) => setGrouperDescription(e.target.value)}
                />
              </Grid>
            </Grid>
            <Grid container justifyContent="flex-end">
              {isOwnedByVSM && enableEditing && !isEditing && (
                <Button variant='contained' onClick={() => setIsEditing(true)}>
                    Edit Metadata
                </Button>
              )}
              {enableEditing && isEditing && (
                <ButtonContainer>
                  <Button
                    variant='contained'
                    disabled={isSaving}
                    sx={{ backgroundColor: 'var(--neutral-300)' }}
                    onClick={(e) => {
                      resetValues()
                      e.preventDefault()
                      setIsEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    variant='contained'
                    disabled={!Boolean(Object.keys(changedMetadataItems).length) || isSaving}
                    loading={isSaving}
                    onClick={async (e) => {
                      e.preventDefault()
                      setIsSaving(true)
                      await submitGrouperUpdates()
                      setIsSaving(false)
                    }}
                  >
                    Save Changes
                  </LoadingButton>
                </ButtonContainer>
              )}
            </Grid>
          </InputContainer>
        </FormControl>
        <ValueSetDetailsTables
          setCurrentValueSet={setCurrentValueSet}
          currentValueSet={currentValueSet}
          programAndGrouperInfo={programAndGrouperInfo}
          isGrouperValueSet={isGrouperValueSet}
          isDraftProgram={isDraftProgram}
        />
      </Box>
    </Box>
  )
}
