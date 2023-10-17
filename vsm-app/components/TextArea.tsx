import styled from 'styled-components'
import { TextField, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'

const Input = styled(TextField)`
  & .MuiInputBase-multiline {
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

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
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
  info?: string
  readonly?: boolean
  style?: React.CSSProperties
  errorMessage?: string | JSX.Element | null
  helperMessage?: string | null
  onKeyPress?: React.KeyboardEventHandler
}

const TextArea = ({
  placeholder,
  onChange,
  value,
  label,
  required = false,
  id,
  defaultValue,
  readonly = false,
  style = {},
  errorMessage = null,
  helperMessage = null,
  onKeyPress
}: Props) => {
  return (
    <Container style={style}>
      <>
        <Input
          id={id}
          label={label}
          name={id}
          variant="filled"
          InputLabelProps={{ shrink: true }}
          helperText={errorMessage || helperMessage}
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
          multiline
          onChange={onChange}
          defaultValue={defaultValue}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.shiftKey == false && onKeyPress) {
              return onKeyPress(e)
            }
          }}
        />
      </>
    </Container>
  )
}

export { TextArea }
