import styled from 'styled-components'
import { TextField, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { MutableRefObject } from 'react'

interface InputProps {
  minWidth?: number
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined
}

const Input = styled(TextField)`
  & .MuiFilledInput-input {
    background: white !important;
  }

  & .Mui-readOnly {
    background: transparent !important;
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
  defaultValue?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  label: string
  id?: string
  value?: string
  def?: string
  hasIcon?: boolean
  disabled?: boolean
  includeInfo?: boolean
  readonly?: boolean
  required?: boolean
  errorMessage?: string | null
  helperMessage?: string | null
  style?: React.CSSProperties
  inputRef?: MutableRefObject<any>
}

const SearchInput = ({
  placeholder,
  onChange,
  onBlur,
  label,
  value,
  defaultValue,
  id,
  disabled = false,
  readonly = false,
  required = false,
  errorMessage = null,
  helperMessage = null,
  style,
  inputRef
}: Props) => {
  return (
    <Container>
      <>
        <Input
          defaultValue={defaultValue}
          label={label}
          variant="filled"
          id={id}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            readOnly: readonly,
            endAdornment: helperMessage ? (
              <Tooltip title={helperMessage} placement="top" arrow>
                <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px', marginLeft: '10px' }} />
              </Tooltip>
            ) : null
          }}
          error={!!errorMessage}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          value={value}
          helperText={errorMessage}
          style={style}
          inputRef={inputRef}
        />
      </>
    </Container>
  )
}

export { SearchInput }
