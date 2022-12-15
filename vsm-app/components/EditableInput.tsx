import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const FieldValue = styled.span`
  white-space: pre-line;
`
interface EditableInputProps {
  value?: string
  onBlur?: Function
  disabled?: boolean
  allowEdit?: boolean
}

const EditableInput = ({value = "", onBlur, disabled = false, allowEdit = true} : EditableInputProps) => {
  const [currentValue, setCurrentValue] = useState(value)
  const [isEdit, setIsEdit] = useState(false)

  useEffect(() => setCurrentValue(value), [value])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentValue(e?.target?.value)

  const submitEvent = () => {
    setIsEdit(false)
    onBlur(currentValue, () => setCurrentValue(value))
  }

  const onKeyPress = (e: React.KeyboardEvent) => {    
    const key = e.keyCode || e.which
    if (key === 13) {
      submitEvent()
    }
  }

  return (
    <>
      {isEdit && !disabled ? ( <textarea
          onChange={onChange}
          onKeyPress={onKeyPress}
          onBlur={submitEvent}
          value={currentValue}
        />
      ) : (
        <FieldValue onClick={() => allowEdit && setIsEdit(true)}>{currentValue}</FieldValue>
      )
      }
    </>
  )
}

export default EditableInput