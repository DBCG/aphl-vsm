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
  defaultValue?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
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
}

const SearchInput = ({
  placeholder,
  onChange,
  label,
  value,
  defaultValue,
  id,
  disabled = false,
  readonly = false,
  required = false,
  errorMessage = null
}: Props) => {
  return (
    <Container>
        <>
          <Input
            defaultValue={defaultValue}
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
            helperText={errorMessage}
          />
        </>
    </Container>
  )
}

export { SearchInput }
