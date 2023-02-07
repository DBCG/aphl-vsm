import { useState } from 'react'
import styled from 'styled-components'
import Modal from 'react-modal'
import { SearchInput, Label } from '../SearchInput'
import Select from 'react-select'
import { TextArea } from '../TextArea'

interface ComponentProps {
  show: boolean
  programId: string
}

const statusOptions = ['Active', 'Draft', 'Experimental', 'Retired', 'Unknown']

const Form = styled.form`
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
`

const FormTitle = styled.h1`
  color: var(--theme-500);
  margin-left: 24px;
  margin-bottom: 48px;
  font-size: 24px;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  min-width: 450px;
`

interface FormData {
  name: string
  title: string
  status: string
  publisher: string
  description: string
  purpose: string
  version: string
}

const defaultFormData = {
  name: '',
  title: '',
  status: '',
  publisher: '',
  description: '',
  purpose: '',
  version: ''
}

const AddGrouperModal = ({ show, programId }: ComponentProps) => {
  const [formData, setFormData] = useState(defaultFormData)

  const updateField = (e, isSelect=false) => {
    const targetKey = isSelect ? 'status' : e.target.id

    const targetValue = isSelect ? e.value : e.target.value
    const updated = Object.assign(formData, { [targetKey]: targetValue })

    setFormData(updated)
  }

  return(
    <Modal
      isOpen={show}
    >
      <FormTitle>Add a Grouper</FormTitle>
      <Form>
        <Col>
          <SearchInput
            label='Title'
            id='title'
            required={true}
            onChange={(e) => updateField(e)}
          />
          <SearchInput
            label='Name'
            id='name'
            required={true}
            onChange={(e) => updateField(e)}
          />
          <div>
            <Label
              id='status-label'
              label='Status'
              required={true}
              readonly={false}
            />
            <Select
              label='Status'
              isMulti={false}
              id='status'
              inputId='status'
              required={true}
              onChange={(e) => updateField(e, true)}
              options={statusOptions?.map(opt => ({ label: opt, value: opt.toLowerCase() }))}
            />
          </div>
          <SearchInput
            label='Publisher'
            id='publisher'
            required={true}
            onChange={(e) => updateField(e)}
          />
          <SearchInput
            label='Version'
            id='version'
            required={true}
            onChange={(e) => updateField(e)}
          />
          <TextArea
            label='Purpose'
            id='purpose'
            required={true}
            onChange={(e) => updateField(e)}
          />
          <TextArea
            label='Description'
            id='description'
            required={true}
            onChange={(e) => updateField(e)}
          />
        </Col>
      </Form>

    </Modal>
  )
}

export { AddGrouperModal }