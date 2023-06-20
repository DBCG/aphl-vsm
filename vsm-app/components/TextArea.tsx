import styled from 'styled-components'
import { TextField } from '@mui/material'

const Input = styled(TextField)`
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
            helperText={errorMessage}
            error={!!errorMessage}
            required={required}
            InputProps={{
              readOnly: readonly
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
