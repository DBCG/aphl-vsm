import styled from 'styled-components'
import { ReadOnlyContainer, ErrorMessage, Label } from './SearchInput'

interface InputProps {
  minWidth?: number;
  minHeight?: number;
  maxInputHeight?: number;
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
}

const Input = styled.textarea<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
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
  placeholder?: string,
  onChange?: React.ChangeEventHandler,
  required?: boolean,
  value?: string,
  label?: string,
  id?: string,
  def?: string,
  minWidth?: number,
  maxInputHeight?: number,
  hasIcon?: boolean,
  info?: string,
  readonly?: boolean,
  style?: React.CSSProperties,
  errorMessage?: string | JSX.Element | null
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
  style={},
  errorMessage = null
}: Props) => {
  return (
    <Container style={style}>
      <FlexRow>
        <Label
          id={id}
          info={info}
          label={label}
          required={required}
          readonly={readonly}
        />
      </FlexRow>
      {readonly ? (
        <ReadOnlyContainer minWidth={minWidth}>
          {def || placeholder}
        </ReadOnlyContainer>
      ): (
        <>
          <Input
            id={id}
            name={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            defaultValue={def}
          />
          { errorMessage && (
            <ErrorMessage>
              {errorMessage}
            </ErrorMessage>
          )}
        </>
      )}
    </Container>
  )
}

export { TextArea }