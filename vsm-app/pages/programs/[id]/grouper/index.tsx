import React, { useEffect, useState } from 'react'
import { FormControl, Grid } from '@mui/material'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
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
import { is } from '@/helpers/is'
import { PriorityLevelOption } from '@/components/ProgramValueSetDetails'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from "@/utils/getLibraryServerSideProp";

const defaultFormData = {
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
  type: 'failed-grouper-add'
  message: string
}

export interface ConditionsHandler {
  conditionInfo: MultiValue<Condition>
  vsId: fhir4.ValueSet['id']
}

export interface PriorityHandler {
  priorityInfo: PriorityLevelOption
  vsId: fhir4.ValueSet['id']
}

const AddGrouper = ({ program }: LibraryServerSideProps) => {
  const [grouperVSets, setGrouperVSets] = useState<FlatGrouperVSet[]>([])
  const [title, setTitle] = useState(defaultFormData.title)
  const [name, setName] = useState(defaultFormData.name)
  const [publisher, setPublisher] = useState(defaultFormData.publisher)
  const [author, setAuthor] = useState(defaultFormData.author)
  const [description, setDescription] = useState(defaultFormData.description)
  const [purpose, setPurpose] = useState(defaultFormData.purpose)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleAddValueSets = (newVsInfo: CombinedGrouperVSets) => {
    const { selectedValueSets, selectedConditions, selectedGroupers, selectedPriority, selectedTerminologyServer } = newVsInfo
    // flatten the format
    const leafsToAdd = selectedValueSets.map((selectedValueSet) => ({
      id: selectedValueSet.id, // needed for the react-data-table component
      selectedValueSet,
      selectedGroupers,
      selectedConditions,
      selectedTerminologyServer,
      selectedPriority
    }))

    const updated = [...grouperVSets, ...leafsToAdd]
    // @ts-ignore
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

  const handleUpdatePriority = ({ priorityInfo, vsId }: PriorityHandler) => {
    const updatedVSets = grouperVSets.map((vs) => {
      if (vs.selectedValueSet.id === vsId) {
        vs.selectedPriority = priorityInfo.value
      }
      return vs
    })

    setGrouperVSets(updatedVSets)
  }

  useEffect(() => {
    const formattedName = capitalizeFirstLetter(stripFromName(title))
    setName(formattedName)
  }, [title])

  const addGrouper = async () => {
    setError(null)
    setLoading(true)

    if (!is.string(program?.version)) {
      setError({ type: 'failed-grouper-add', message: `Parent Program with id ${program?.id} needs a version` })
      return
    }
    const grouperMetadata: GrouperMetadata = {
      title,
      name,
      publisher,
      author,
      description,
      purpose,
      version: program?.version
    }

    const json = JSON.stringify({
      grouperVSets,
      grouperMetadata
    })

    const res = await fetch(`/api/programs/${program?.id}/grouper/valueset`, {
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
    }
  }
  const currentSelectedVSId: string[] = grouperVSets?.map((i) => i?.selectedValueSet?.id as string)?.filter((i) => i)

  const submitDisabled =
    !(grouperVSets.length && title && author && publisher && description && purpose && program?.version) || !startsAlphabetically(title)

  return (
    <>
      <FormTitle>Add a Grouper</FormTitle>
      <FormSectionHeader itemNum={1} title={<> Enter metadata for new grouper</>} />
      <FormControl error={Boolean(error)}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextArea
              label="Title"
              id="title"
              required={true}
              onChange={(e) => updateField(e)}
              value={title}
              errorMessage={!title ? 'field required' : title && !startsAlphabetically(title) ? '* Field must start with a letter' : null}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea
              label="Author"
              id="author"
              required={true}
              onChange={(e) => updateField(e)}
              value={author}
              errorMessage={!author ? 'field required' : null}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea
              label="Publisher/Steward"
              id="publisher"
              required={true}
              onChange={(e) => updateField(e)}
              value={publisher}
              errorMessage={!publisher ? 'field required' : null}
            />
          </Grid>
          <Grid item xs={12}>
            <TextArea
              label="Purpose"
              id="purpose"
              required={true}
              onChange={(e) => updateField(e)}
              value={purpose}
              errorMessage={!purpose ? 'field required' : null}
            />
          </Grid>
          <Grid item xs={12}>
            <TextArea
              label="Description"
              id="description"
              multiline={true}
              required={true}
              onChange={(e) => updateField(e)}
              value={description}
              errorMessage={!description ? 'field required' : null}
            />
          </Grid>
        </Grid>
      </FormControl>
      <FormSectionHeader itemNum={2} title="Search and add valuesets to grouper, conditions optional" />
      <ValueSetSearchTable handleAddValueSets={handleAddValueSets} tableContext="add-grouper" currentSelectedVSId={currentSelectedVSId} />
      <FormSectionHeader itemNum={3} title="Review draft grouper information" />
      <Subtitle>Grouper Metadata</Subtitle>
      <MetadataContainer>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextArea value={title} label="Title" id="title" readonly={true} placeholder={title || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea value={author} readonly={true} label="Author" id="author" placeholder={author || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea value={publisher} readonly={true} label="Publisher/Steward" id="publisher" placeholder={publisher || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea value={name} label="Name (autogenerated)" readonly={true} id="name" placeholder={name || '---'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextArea
              defaultValue={program?.version}
              readonly={true}
              label="Version (autogenerated)"
              id="version"
              placeholder={program?.version || ''}
            />
          </Grid>
          <Grid item xs={12}>
            <TextArea value={description} readonly={true} label="Description" id="description" placeholder={description || '---'} />
          </Grid>
          <Grid item xs={12}>
            <TextArea value={purpose} readonly={true} label="Purpose" id="purpose" placeholder={purpose || '---'} />
          </Grid>
        </Grid>
      </MetadataContainer>
      <Subtitle>Valuesets to Add</Subtitle>
      <VSReviewTable
        vsToAdd={grouperVSets || []}
        setGrouperVSets={setGrouperVSets}
        handleUpdateConditions={handleUpdateConditions}
        handleUpdatePriority={handleUpdatePriority}
      />
      <FormSectionHeader itemNum={4} title="Submit to create grouper for this program" />
      <Row style={{ justifyContent: 'center', marginBottom: '24px' }}>
        <Button
          id="submit-grouper-creation"
          style={{
            fontSize: '150%'
          }}
          loading={loading}
          text="SUBMIT"
          disabled={submitDisabled || loading}
          onClick={async () => await addGrouper()}
        />
      </Row>
      <ErrorMessage error={error?.message || null} />
    </>
  )
}

export default AddGrouper
