import styled from 'styled-components'
import { TextField, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'

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
  helperMessage?: string | null
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
  errorMessage = null,
  helperMessage = null
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
                <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
              </Tooltip>
            ) : null
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
