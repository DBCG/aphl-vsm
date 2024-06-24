import React, { useState } from 'react';
import styled from 'styled-components'
import ClearIcon from '@mui/icons-material/Clear';

interface InputProps {
  minWidth?: number
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined
}

const Input = styled.input<InputProps>`
  padding: 4px 25px 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
  width: 100%;
  position: relative;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`

interface Props {
  placeholder?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  value?: string
  id?: string
  def?: string
  minWidth?: number
  hasIcon?: boolean
  disabled?: boolean
  style?: React.CSSProperties
  isClearable?: boolean;
}

const ClearButton = styled.button`
  color: rgba(0, 0, 0, 0.87);
  background: transparent;
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  cursor: pointer;
  outline: none;
  padding: 0px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FilterInput = ({ placeholder, onChange, value, def, style, minWidth, disabled = false, isClearable = true }: Props) => {
  const [inputValue, setInputValue] = useState<string | undefined>(value || def || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (onChange){
      onChange(e);
    } 
  };

  const clearInput = () => {
    setInputValue('');
    if (onChange) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <Container>
      <Input
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        onChange={handleChange}
        minWidth={minWidth}
        disabled={disabled}
        value={inputValue}
        defaultValue={def}
        style={style}
      />
      {isClearable && inputValue && (
        <ClearButton onClick={clearInput}>
          <ClearIcon fontSize="small" />
        </ClearButton>
      )}
    </Container>
  )
}

export { FilterInput }
