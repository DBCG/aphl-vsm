import styled from 'styled-components'
import { TextField, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { MutableRefObject } from 'react'
import { StyledLabel } from './InputLabel'

const Input = styled(TextField)`
  & .MuiFilledInput-input {
    padding: 7px 7px;
  }

  & .MuiInputBase-root {
    background: white !important;
  }

  & .MuiInputBase-multiline {
    padding: 0px;
    background: white !important;
  }

  & .Mui-readOnly {
    background: transparent !important;
    padding: 0px;
  }

  & .Mui-readOnly::before {
    display: none !important;
  }

  & .Mui-readOnly::after {
    display: none !important;
  }
` as typeof TextField

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  placeholder?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement> & React.ChangeEventHandler<HTMLTextAreaElement>
  required?: boolean
  value?: string
  label?: string
  id?: string
  defaultValue?: string
  maxInputHeight?: number
  hasIcon?: boolean
  disabled?: boolean
  multiline?: boolean
  info?: string
  readonly?: boolean
  style?: React.CSSProperties
  errorMessage?: string | JSX.Element | null
  helperMessage?: string | null
  onKeyPress?: React.KeyboardEventHandler
  inputRef?: MutableRefObject<any>
}

const TextArea = ({
  placeholder,
  onChange,
  value,
  label,
  required = false,
  id,
  multiline = false,
  defaultValue,
  disabled = false,
  readonly = false,
  style = {},
  errorMessage = null,
  helperMessage = null,
  onKeyPress,
  inputRef
}: Props) => {
  return (
    <Container style={style}>
      <StyledLabel htmlFor={id} enableEditing={!readonly} required={required}>
        {label}
      </StyledLabel>
      <Input
        id={id}
        name={id}
        disabled={disabled}
        variant="filled"
        InputLabelProps={{ shrink: true }}
        helperText={errorMessage}
        error={!!errorMessage}
        required={required}
        InputProps={{
          readOnly: readonly,
          endAdornment: helperMessage ? (
            <Tooltip title={helperMessage} placement="top" arrow>
              <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
            </Tooltip>
          ) : null
        }}
        placeholder={placeholder}
        value={value}
        multiline={multiline}
        onChange={onChange}
        defaultValue={defaultValue}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.shiftKey == false && onKeyPress) {
            return onKeyPress(e)
          }
        }}
        inputRef={inputRef}
      />
    </Container>
  )
}

export { TextArea }
