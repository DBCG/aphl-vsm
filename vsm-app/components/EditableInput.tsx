import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const FieldValue = styled.span`
  white-space: pre-line;
`
interface EditableInputProps {
  value: string,
  onBlur: Function
}

const EditableInput = ({value = "", onBlur} : EditableInputProps) => {
  const [currentValue, setCurrentValue] = useState(value)
  const [isEdit, setIsEdit] = useState(false)

  useEffect(() => setCurrentValue(value), [value])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentValue(e?.target?.value)

  const submitEvent = () => {
    setIsEdit(false)
    onBlur(currentValue)
  }

  const onKeyPress = (e: React.KeyboardEvent) => {    
    const key = e.keyCode || e.which
    if (key === 13) {
      submitEvent()
    }
  }

  return (
    <>
      {isEdit ? ( <textarea
          onChange={onChange}
          onKeyPress={onKeyPress}
          onBlur={submitEvent}
          value={currentValue}
        />
      ) : (
        <FieldValue onClick={() => setIsEdit(true)}>{currentValue}</FieldValue>
      )
      }
    </>
  )
}

export default EditableInput