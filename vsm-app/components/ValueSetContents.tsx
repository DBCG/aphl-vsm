import { useState, useEffect, SetStateAction, Dispatch } from 'react'
import { Box, Typography } from '@mui/material'
import { toast } from 'react-toastify'
import { PageTitle } from '@/components/Typography'
import { Button } from './buttons/Button'
import LoadingIndicator from './LoadingIndicator'
import { Form } from './ProgramMetadata/styles'
import { SearchInput } from '@/components/SearchInput'
import { ProgramDetails } from '@/types/grouperTypes'
import { InputRow, InputContainer, ButtonContainer } from '@/styles'
import { TextArea } from './TextArea'
import { getOid } from '@/helpers/valueSetHelpers'
import ValueSetDetailsTables from './ValueSetDetailsTables'
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
  const [currentValueSet, setCurrentValueSet] = useState(valueSet)

  const {
    version: defaultGrouperVersion,
    description: defaultGrouperDescription,
    publisher: defaultGrouperPublisher,
    purpose: defaultGrouperPurpose
  } = valueSet

  // could be multiple authors maybe?
  const defaultGrouperAuthor =
    valueSet?.extension?.find((ext) => ext?.url?.endsWith('/StructureDefinition/valueset-author'))?.valueContactDetail?.name || ''

  const [grouperDescription, setGrouperDescription] = useState(defaultGrouperDescription)
  const [grouperPurpose, setGrouperPurpose] = useState(defaultGrouperPurpose)
  const [grouperPublisher, setGrouperPublisher] = useState(defaultGrouperPublisher)
  const [grouperAuthor, setGrouperAuthor] = useState(defaultGrouperAuthor)
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

    setChangedMetadataItems(metadataItemsChanged)
  }, [
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
  }

  const submitGrouperUpdates = async () => {
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
      return
    }

    // check that there are fields to change
    if (!Object.keys(changedMetadataItems).length) {
      setError({
        type: 'no-fields-changed',
        message: 'No fields were changed, update cancelled.'
      })
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
    setIsEditing(false)
  }

  const programUrl = programAndGrouperInfo?.program?.url
  const programVersion = programAndGrouperInfo?.program?.version
  return (
    <Box>
      <Box sx={{ width: '100%', backgroundColor: 'var(--theme-100)', padding: '24px' }}>
        <Form style={{ flexDirection: 'column' }}>
          <PageTitle>{currentValueSet.title}</PageTitle>
          <Typography
            sx={{
              background: isGrouperValueSet ? 'var(--accent)' : 'var(--theme-300)',
              color: 'white',
              padding: '4px 10px',
              width: '85px',
              textAlign: 'center',
              borderRadius: '8px'
            }}
          >
            {isGrouperValueSet ? 'Grouper' : 'Leaf'}
          </Typography>
          <InputContainer style={{ width: '100%' }}>
            <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
              <SearchInput
                id="prog-id"
                label="Program ID"
                readonly={true}
                def={programAndGrouperInfo?.program?.id || 'No ID found'}
                placeholder={'No valueset id set'}
              />
              {isDraftProgram && (
                <Typography
                  style={{
                    background: '#FAA024',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    height: 'max-content'
                  }}
                >
                  Draft
                </Typography>
              )}
            </InputRow>
            <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
              <SearchInput
                id="prog-name"
                label="Program Name"
                readonly={true}
                def={programAndGrouperInfo?.program?.name || 'No name found'}
                placeholder={'No valueset id set'}
              />
            </InputRow>
            <InputRow>
              <SearchInput
                id="prog-version"
                label="Program Version"
                readonly={true}
                def={programVersion}
                placeholder={'No program version set'}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="prog-url"
                label="Program URL"
                minWidth={650}
                readonly={true}
                def={programUrl}
                placeholder={'No program canonical set'}
              />
            </InputRow>
          </InputContainer>
          <InputContainer>
            <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
              <SearchInput
                id="vs-id"
                label={isGrouperValueSet ? 'Grouper ID' : 'Valueset ID'}
                readonly={true}
                def={valueSet.id}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} id set`}
              />
              {isGrouperValueSet && enableEditing && !isEditing && (
                <Button
                  text="Edit Metadata"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsEditing(true)
                  }}
                />
              )}
              {enableEditing && isEditing && (
                <ButtonContainer>
                  <Button
                    text="Cancel"
                    style={{ backgroundColor: 'darkGray' }}
                    onClick={(e) => {
                      resetValues()
                      e.preventDefault()
                      setIsEditing(false)
                    }}
                  />
                  <Button
                    disabled={!Boolean(Object.keys(changedMetadataItems).length)}
                    text="Save Changes"
                    onClick={async (e) => {
                      e.preventDefault()
                      await submitGrouperUpdates()
                    }}
                  />
                </ButtonContainer>
              )}
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-version"
                label={isGrouperValueSet ? 'Grouper Version' : 'Valueset Version'}
                readonly={true}
                value={defaultGrouperVersion}
                def={defaultGrouperVersion}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} version set`}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-url"
                label={'URL'}
                readonly={true}
                value={currentValueSet.url}
                def={currentValueSet.url}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} url set`}
              />
            </InputRow>
            {!isGrouperValueSet && (
              <InputRow style={{ width: '100%' }}>
                <SearchInput
                  id="vs-oid"
                  label={'OID'}
                  readonly={true}
                  value={getOid(currentValueSet)}
                  def={getOid(currentValueSet)}
                  placeholder={'No valueset oid was set'}
                />
              </InputRow>
            )}
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-publisher"
                label="Publisher"
                minWidth={650}
                readonly={!isEditing}
                value={grouperPublisher}
                def={defaultGrouperPublisher}
                placeholder={'No valueset publisher set'}
                onChange={(e) => setGrouperPublisher(e.target.value)}
              />
              <SearchInput
                id="vs-author"
                label="Author"
                minWidth={650}
                readonly={!isEditing}
                value={grouperAuthor}
                def={defaultGrouperAuthor}
                placeholder={'No valueset author set'}
                onChange={(e) => setGrouperAuthor(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <TextArea
                id="vs-purpose"
                label="Purpose"
                minWidth={650}
                readonly={!isEditing}
                value={grouperPurpose}
                def={defaultGrouperPurpose}
                placeholder={'No valueset purpose set'}
                onChange={(e) => setGrouperPurpose(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <TextArea
                id="vs-description"
                label="Description"
                minWidth={650}
                readonly={!isEditing}
                value={grouperDescription}
                def={defaultGrouperDescription}
                placeholder={'No valueset description set'}
                onChange={(e) => setGrouperDescription(e.target.value)}
              />
            </InputRow>
          </InputContainer>
        </Form>
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
