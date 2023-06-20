import styled from 'styled-components'
import { TextField } from '@mui/material'
import { InputLabel, ErrorMessage, ReadOnlyContainer } from './InputLabel'

interface InputProps {
  minWidth?: number
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined
}

const Input = styled(TextField)`
` as typeof TextField

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  placeholder?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  label: string
  id?: string
  value?: string
  def?: string
  minWidth?: number
  hasIcon?: boolean
  disabled?: boolean
  includeInfo?: boolean
  info?: string
  style?: React.CSSProperties
  readonly?: boolean
  required?: boolean
  errorMessage?: string | null
}

const SearchInput = ({
  placeholder,
  onChange,
  label,
  value,
  def,
  id,
  style,
  minWidth,
  info,
  disabled = false,
  readonly = false,
  required = false,
  errorMessage = null
}: Props) => {
  return (
    <Container>
        <>
          <InputLabel id={id}>{label}</InputLabel>
          <Input
            label={label}
            variant='filled'
            id={id}
            InputProps={{
              readOnly: readonly
            }}
            error={!!errorMessage}
            placeholder={placeholder}
            onChange={onChange}
            disabled={disabled}
            required={required}
            value={value}
            defaultValue={def}
            helperText={errorMessage}
          />
        </>
    </Container>
  )
}

export { SearchInput }
