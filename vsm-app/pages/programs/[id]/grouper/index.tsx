import React, { useEffect, useState } from 'react'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useRouter } from 'next/router'
import { Button } from '@/components/buttons/Button'
import { VSReviewTable } from '@/components/VSReviewTable'
import { stripFromName, startsAlphabetically, capitalizeFirstLetter } from '@/helpers/stringHelpers'
import {
  Form,
  FormDirections,
  FormTitle,
  DirectionContainer,
  Col,
  Row,
  MetadataContainer,
  Subtitle,
  Asterisk,
  NumberItem
} from '@/components/forms/styled/formElements'
import { ErrorMessage } from '@/components/ErrorMessage'
import { MultiValue } from 'react-select'
import { CombinedGrouperVSets, FlatGrouperVSet, GrouperMetadata } from '@/types/grouperTypes'
import { Condition } from '@/helpers/conditionHelpers'
import { LoadingModal } from '@/components/modals/LoadingModal'

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
  type: 'failed-grouper-add'
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
  const [loading, setLoading] = useState(false)

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

  const router = useRouter()
  const programId = router.query.id as string

  const addGrouper = async () => {
    setError(null)
    setLoading(true)

    const grouperMetadata: GrouperMetadata = {
      id,
      title,
      name,
      publisher,
      author,
      description,
      purpose,
      version
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
        setId(targetValue)
    }
  }

  const submitDisabled =
    !(grouperVSets.length && title && id && author && publisher && description && purpose) || !startsAlphabetically(title)

  return (
    <>
      <LoadingModal
        isOpen={loading}
        actionType="grouper-add"
        program={null}
        handleCancelModal={() => {}}
        loading={loading}
        handleModalAction={() => {}}
      />
      <FormTitle>Add a Grouper</FormTitle>
      <FormSectionHeader
        itemNum={1}
        title={
          <>
            {' '}
            Enter metadata for new grouper (all fields required<Asterisk>*</Asterisk>)
          </>
        }
      />
      <Form>
        <SearchInput label="ID" id="id" required={true} onChange={(e) => updateField(e)} value={id} />
        <SearchInput label="Author" id="author" required={true} onChange={(e) => updateField(e)} value={author} />
        <SearchInput label="Publisher/Steward" id="publisher" required={true} onChange={(e) => updateField(e)} value={publisher} />
        <SearchInput
          label="Title"
          id="title"
          required={true}
          onChange={(e) => updateField(e)}
          value={title}
          errorMessage={title && !startsAlphabetically(title) ? '* Field must start with a letter' : null}
        />
        <TextArea label="Purpose" id="purpose" required={true} onChange={(e) => updateField(e)} value={purpose} />
        <TextArea label="Description" id="description" required={true} onChange={(e) => updateField(e)} value={description} />
      </Form>
      <FormSectionHeader itemNum={2} title="Search and add valuesets to grouper, conditions optional" />
      <ValueSetSearchTable handleAddValueSets={handleAddValueSets} tableContext="add-grouper" />
      <FormSectionHeader itemNum={3} title="Review draft grouper information" />
      <Subtitle>Grouper Metadata</Subtitle>
      <MetadataContainer>
        <Col>
          <SearchInput label="ID" id="id" readonly={true} placeholder={id || '---'} />
          <SearchInput label="Title" id="title" readonly={true} placeholder={title || '---'} />
          <SearchInput label="Name (autogenerated from title)" readonly={true} id="name" placeholder={name || '---'} />
          <SearchInput readonly={true} label="Publisher/Steward" id="publisher" placeholder={publisher || '---'} />
          <SearchInput readonly={true} label="Author" id="author" placeholder={author || '---'} />
        </Col>
        <Col>
          <TextArea readonly={true} label="Description" id="description" placeholder={description || '---'} />
          <TextArea readonly={true} label="Purpose" id="purpose" placeholder={purpose || '---'} />
          <SearchInput readonly={true} label="Version (autogenerated)" id="version" placeholder={version} />
        </Col>
      </MetadataContainer>
      <Subtitle>Valuesets in Grouper</Subtitle>
      <VSReviewTable vsToAdd={grouperVSets || []} setGrouperVSets={setGrouperVSets} handleUpdateConditions={handleUpdateConditions} />
      <FormSectionHeader itemNum={4} title="Submit to create grouper for this program" />
      <Row style={{ justifyContent: 'center', marginBottom: '24px' }}>
        <Button
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
