import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { SearchInput, Label } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useRouter } from 'next/router'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'
import { Button } from '@/components/buttons/Button'

const Form = styled.form`
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
`

const FormTitle = styled.h1`
  color: var(--theme-500);
  margin-bottom: 24px;
  font-size: 24px;
  width: 100%;
`

const DirectionContainer = styled.div`
  display: flex;
  align-items: center;
`

const FormDirections = styled.p`
  color: var(--theme-500);
  font-size: 18px;
  margin-bottom: 48px;
  display: flex;
  align-items: center;
  margin-top: 64px;
`

const NumberItem = styled.div`
  width: 50px;
  height: 50px;
  background-color: white;
  color: var(--theme-500);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 150%;
  margin-right: 12px;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  min-width: 450px;
`

const Row = styled.div`
  display: flex;
`

const MetadataContainer = styled.div`
  background-color: white;
  padding: 24px 36px;
  padding-bottom: 64px;
  display: flex;
`

interface FormData {
  name: string
  title: string
  publisher: string
  author: string
  description: string
  purpose: string
  version: string
}

const defaultFormData = {
  name: '',
  title: '',
  status: '',
  author: process.env.NEXT_PUBLIC_DEFAULT_AUTHOR,
  publisher: process.env.NEXT_PUBLIC_DEFAULT_PUBLISHER,
  description: '',
  purpose: '',
  version: new Date().toISOString().substring(0,10)
}

const stripFromName = (str: string) => {
  const trimmed = str.trim()

  if (trimmed === '') return trimmed

  const cleaned = trimmed.replace(/[^a-zA-Z0-9\w]/g, '_')
  console.log('cleaned ' , cleaned)
  return cleaned
}

const AddGrouperModal = () => {
  // const [grouperData, setGrouperData] = useState(defaultFormData)
  const [grouperVSets, setGrouperVSets] = useState({})
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [publisher, setPublisher] = useState(process.env.NEXT_PUBLIC_DEFAULT_PUBLISHER)
  const [author, setAuthor] = useState(process.env.NEXT_PUBLIC_DEFAULT_AUTHOR)
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState('')

  const router = useRouter()
  const programId = router.query.id as string

  const updateField = (e, isSelect=false) => {
    const targetKey = e.target.id
    const targetValue = e.target.value
    switch(targetKey) {
      case 'title':
        setTitle(targetValue)
        break;
      case 'author':
        setAuthor(targetValue)
        break;
      case 'publisher':
        setPublisher(targetValue)
        break;
      case 'description':
        setDescription(targetValue)
        break
      case 'purpose':
        setPurpose(targetValue)
    }
  }

  useEffect(() => {
    console.table(grouperVSets)
  }, [grouperVSets])

  return(
  <>
  <FormTitle>Add a Grouper</FormTitle>
  <DirectionContainer>
    <FormDirections>
      <NumberItem>1</NumberItem> Enter metadata for new grouper (all fields required)
    </FormDirections>
  </DirectionContainer>
    <Form>
      <Col>
        <SearchInput
          label='Title'
          id='title'
          required={true}
          onChange={(e) => 
            updateField(e)
          }
          value={title}
        />
        <SearchInput
          label='Author'
          id='author'
          required={true}
          onChange={(e) => updateField(e)}
          value={author}
        />
        <TextArea
          label='Purpose'
          id='purpose'
          required={true}
          onChange={(e) => updateField(e)}
          value={purpose}
        />
        </Col>
        <Col>
        <SearchInput
          label='Publisher/Steward'
          id='publisher'
          required={true}
          onChange={(e) => updateField(e)}
          value={publisher}
        />
        <TextArea
          label='Description'
          id='description'
          required={true}
          onChange={(e) => updateField(e)}
          value={description}
        />
      </Col>
    </Form>
    <DirectionContainer>
      <NumberItem>2</NumberItem><FormDirections>Select at least one valueset to include in grouper (conditions optional)</FormDirections>
    </DirectionContainer>
    <ValueSetSearchTable setGrouperVSets={setGrouperVSets} grouperVSets={grouperVSets}/>
    
    <DirectionContainer>
      <FormDirections><NumberItem>3</NumberItem>Review draft grouper information</FormDirections>
    </DirectionContainer>
    <MetadataContainer>
      <Col>
        <SearchInput
          label='Title'
          id='title'
          readonly={true}
          placeholder={title}
          value={title}
        />
        <SearchInput
          label='Name (autogenerated from title)'
          readonly={true}
          id='name'
          value={(stripFromName(title))}
          placeholder={(stripFromName(title))}
        />
        <SearchInput
          readonly={true}
          label='Publisher/Steward'
          id='publisher'
          placeholder={publisher}
        />
        <SearchInput
          readonly={true}
          label='Author'
          id='author'
          placeholder={author}
        />
        {/* <SearchInput
          readonly={true}
          label='Version'
          id='version'
          placeholder={version}
        /> */}
        </Col>
        <Col>
        <TextArea
          readonly={true}
          label='Description'
          id='description'
          placeholder={description}
        />
        <TextArea
          readonly={true}
          label='Purpose'
          id='purpose'
          placeholder={purpose}
        />
      </Col>
    </MetadataContainer>
    <DirectionContainer>
      <FormDirections><NumberItem>4</NumberItem>Submit grouper to save</FormDirections>
    </DirectionContainer>
    <Button
      style={{
        fontSize: '150%',
        margin: '0 auto'
      }}
      text='SUBMIT'/>
  </>
  )
}

export default AddGrouperModal