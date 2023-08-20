import React, { useEffect, useState } from 'react'
import { FormControl, Grid } from '@mui/material'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import { VSReviewTable } from '@/components/VSReviewTable'
import { stripFromName, startsAlphabetically, capitalizeFirstLetter } from '@/helpers/stringHelpers'
import {
  FormDirections,
  FormTitle,
  DirectionContainer,
  Row,
  MetadataContainer,
  Subtitle,
  NumberItem
} from '@/components/forms/styled/formElements'
import { ErrorMessage } from '@/components/ErrorMessage'
import { MultiValue } from 'react-select'
import { CombinedGrouperVSets, FlatGrouperVSet, GrouperMetadata } from '@/types/grouperTypes'
import { Condition } from '@/helpers/conditionHelpers'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { is } from '@/helpers/is'

const defaultFormData = {
  id: '',
  name: '',
  title: '',
  status: '',
  author: process.env.NEXT_PUBLIC_DEFAULT_AUTHOR || '',
  publisher: process.env.NEXT_PUBLIC_DEFAULT_PUBLISHER || '',
  description: '',
  purpose: ''
}

interface Header {
  itemNum: number
  title: string | React.ReactElement
}

const FormSectionHeader = ({ itemNum, title }: Header) => (
  <DirectionContainer>
    <FormDirections>
      <NumberItem>{itemNum}</NumberItem> {title}
    </FormDirections>
  </DirectionContainer>
)

interface Error {
  type: 'failed-grouper-add' | 'failed-id-format'
  message: string
}

export interface ConditionsHandler {
  conditionInfo: MultiValue<Condition>
  vsId: fhir4.ValueSet['id']
}

const AddGrouper = () => {
  const [grouperVSets, setGrouperVSets] = useState<FlatGrouperVSet[]>([])
  const [id, setId] = useState(defaultFormData.id)
  const [title, setTitle] = useState(defaultFormData.title)
  const [name, setName] = useState(defaultFormData.name)
  const [publisher, setPublisher] = useState(defaultFormData.publisher)
  const [author, setAuthor] = useState(defaultFormData.author)
  const [description, setDescription] = useState(defaultFormData.description)
  const [purpose, setPurpose] = useState(defaultFormData.purpose)
  const [error, setError] = useState<Error | null>(null)
  const [grouperFormError, setGrouperFormError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [programVersion, setProgramVersion] = useState(null)

  const router = useRouter()
  const programId = router.query.id as string

  useEffect(() => {
    setError(null)
    const getProgram = async () => {
      const res = await fetch(`/api/programs?id=${programId}`)
      if (res?.ok) {
        const json = await res.json()
        setProgramVersion(json?.programs?.[0]?.version)
      } else {
        setError({ type: 'failed-grouper-add', message: 'Something went wrong fetching the parent program' })
      }
    }
    getProgram()
  }, [programId])

  const handleAddValueSets = (newVsInfo: CombinedGrouperVSets) => {
    const { selectedValueSets, selectedConditions, selectedGroupers, selectedTerminologyServer } = newVsInfo

    // flatten the format
    const leafsToAdd = selectedValueSets.map((selectedValueSet) => ({
      selectedValueSet,
      selectedGroupers,
      selectedConditions,
      selectedTerminologyServer
    }))

    const updated = [...grouperVSets, ...leafsToAdd]
    setGrouperVSets(updated)
  }

  const handleUpdateConditions = ({ conditionInfo, vsId }: ConditionsHandler) => {
    const updatedVSets = grouperVSets.map((vs) => {
      if (vs.selectedValueSet.id === vsId) {
        vs.selectedConditions = conditionInfo as Condition[]
      }
      return vs
    })

    setGrouperVSets(updatedVSets)
  }

  const version = new Date().toISOString().substring(0, 10)

  useEffect(() => {
    const formattedName = capitalizeFirstLetter(stripFromName(title))
    setName(formattedName)
  }, [title])

  const addGrouper = async () => {
    setError(null)
    setLoading(true)
    
    if(!is.string(programVersion)) {
      setError({ type: 'failed-grouper-add', message: `Parent Program with id ${programId} needs a version` })
      return
    }
    const grouperMetadata: GrouperMetadata = {
      id,
      title,
      name,
      publisher,
      author,
      description,
      purpose,
      version: programVersion
    }

    const json = JSON.stringify({
      grouperVSets,
      grouperMetadata
    })

    const res = await fetch(`/api/programs/${programId}/grouper/valueset`, {
      method: 'POST',
      body: json
    })

    if (res.ok) {
      router.push(`/programs/${router.query.id}`)
    } else {
      const json = await res.json()
      setLoading(false)
      setError({ type: 'failed-grouper-add', message: json?.error || `Failed to add grouper '${name}'` })
    }
  }

  const updateField = (e: React.BaseSyntheticEvent) => {
    const targetKey = e.target.id
    const targetValue = e.target.value
    switch (targetKey) {
      case 'title':
        setTitle(targetValue)
        break
      case 'author':
        setAuthor(targetValue)
        break
      case 'publisher':
        setPublisher(targetValue)
        break
      case 'description':
        setDescription(targetValue)
        break
      case 'purpose':
        setPurpose(targetValue)
        break
      case 'id':
        const regexMatch = /[A-Za-z0-9\-\.]{1,64}/
        if(!targetValue.match(regexMatch) && targetValue?.trim() !== '') {
          setGrouperFormError({
            type: 'failed-id-format',
            message: `Grouper ID may only contain A-Z, a-z, numbers, hyphens, and periods. Limit 64 characters.`
          })
        } else {
          setGrouperFormError(null)
        }
        setId(targetValue)
    }
  }
  const currentSelectedVSId: string[] = grouperVSets?.map((i) => i?.selectedValueSet?.id as string)?.filter(i => i)

  const submitDisabled =
    !(grouperVSets.length && title && id && author && publisher && description && purpose && programVersion)
      || !startsAlphabetically(title)
      || grouperFormError


  return (
    <>
      <FormTitle>Add a Grouper</FormTitle>
      <FormSectionHeader
        itemNum={1}
        title={
          <>
            {' '}
            Enter metadata for new grouper
          </>
        }
      />
      <ErrorMessage
        style={{ marginBottom: '2rem' }}
        error={grouperFormError?.message || ''}
      />
      <FormControl error={Boolean(error)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <SearchInput label="ID" id="id" required={true} onChange={(e) => updateField(e)} value={id}  errorMessage={!id ? "field required [letters, numbers, hyphens, and periods only]" : null}/>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput label="Author" id="author" required={true} onChange={(e) => updateField(e)} value={author}  errorMessage={!author ? "field required" : null}/>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput label="Publisher/Steward" id="publisher" required={true} onChange={(e) => updateField(e)} value={publisher} errorMessage={!publisher ? "field required" : null}/>
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchInput
              label="Title"
              id="title"
              required={true}
              onChange={(e) => updateField(e)}
              value={title}
              errorMessage={!title ? 'field required' : title && !startsAlphabetically(title) ? '* Field must start with a letter' : null}
            />
          </Grid>
          <Grid item xs={12}>
            <TextArea label="Purpose" id="purpose" required={true} onChange={(e) => updateField(e)} value={purpose} errorMessage={!purpose ? "field required" : null}/>
          </Grid>
          <Grid item xs={12}>
            <TextArea label="Description" id="description" required={true} onChange={(e) => updateField(e)} value={description} errorMessage={!description ? "field required" : null}/>
          </Grid>
        </Grid>
      </FormControl>
      <FormSectionHeader itemNum={2} title="Search and add valuesets to grouper, conditions optional" />
      <ValueSetSearchTable handleAddValueSets={handleAddValueSets} tableContext="add-grouper" currentSelectedVSId={currentSelectedVSId} />
      <FormSectionHeader itemNum={3} title="Review draft grouper information" />
      <Subtitle>Grouper Metadata</Subtitle>
      <MetadataContainer>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <SearchInput value={id} label="ID" id="id" readonly={true} placeholder={id || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput value={title} label="Title" id="title" readonly={true} placeholder={title || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput value={name} label="Name (autogenerated)" readonly={true} id="name" placeholder={name || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput defaultValue={programVersion || undefined} readonly={true} label="Version (autogenerated)" id="version" placeholder={programVersion || ''} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput value={publisher} readonly={true} label="Publisher/Steward" id="publisher" placeholder={publisher || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <SearchInput value={author} readonly={true} label="Author" id="author" placeholder={author || '---'} />
          </Grid>
          <Grid item xs={12}>
            <TextArea value={description} readonly={true} label="Description" id="description" placeholder={description || '---'} />
          </Grid>
          <Grid item xs={12}>
            <TextArea value={purpose} readonly={true} label="Purpose" id="purpose" placeholder={purpose || '---'} />
          </Grid>
        </Grid>
      </MetadataContainer>
      <Subtitle>Valuesets in Grouper</Subtitle>
      <VSReviewTable vsToAdd={grouperVSets || []} setGrouperVSets={setGrouperVSets} handleUpdateConditions={handleUpdateConditions} />
      <FormSectionHeader itemNum={4} title="Submit to create grouper for this program" />
      <Row style={{ justifyContent: 'center', marginBottom: '24px' }}>
        <Button
          id="submit-grouper-creation"
          loading={loading}
          style={{
            fontSize: '150%'
          }}
          text="SUBMIT"
          disabled={submitDisabled}
          onClick={async () => await addGrouper()}
        />
      </Row>
      <ErrorMessage error={error?.message || null} />
    </>
  )
}

export default AddGrouper
