import styled from 'styled-components'
import { InputLabel, ErrorMessage, ReadOnlyContainer } from './InputLabel'

interface InputProps {
  minWidth?: number
  minHeight?: number
  maxInputHeight?: number
  onChange: Props['onChange']
}

const Input = styled.textarea<InputProps>`
  min-width: ${(props) => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

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
  def?: string
  minWidth?: number
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
  def,
  minWidth,
  info,
  readonly = false,
  style = {},
  errorMessage = null,
  onKeyPress
}: Props) => {
  return (
    <Container style={style}>
      <FlexRow>
        <InputLabel id={id} info={info} label={label} required={required} readonly={readonly} />
      </FlexRow>
      {readonly ? (
        <ReadOnlyContainer id={id} minWidth={minWidth}>{def || placeholder}</ReadOnlyContainer>
      ) : (
        <>
          <Input
            id={id}
            name={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            defaultValue={def}
            minWidth={minWidth}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.shiftKey == false && onKeyPress) {
                return onKeyPress(e)
              }
            }}
          />
          {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </>
      )}
    </Container>
  )
}

export { TextArea }
