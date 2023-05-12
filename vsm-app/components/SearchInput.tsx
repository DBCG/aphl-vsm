import styled from 'styled-components'
import { InputLabel, ErrorMessage, ReadOnlyContainer } from './InputLabel'

interface InputProps {
  minWidth?: number
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined
}

const Input = styled.input<InputProps>`
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
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  label?: string
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
      <FlexRow>
        <InputLabel id={id} info={info} label={label} required={required} readonly={readonly} />
      </FlexRow>
      {readonly ? (
        <ReadOnlyContainer id={id} minWidth={minWidth}>{def || placeholder}</ReadOnlyContainer>
      ) : (
        <>
          <Input
            id={id}
            placeholder={placeholder}
            onChange={onChange}
            minWidth={minWidth}
            disabled={disabled}
            value={value}
            defaultValue={def}
            style={style}
          />
          {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </>
      )}
    </Container>
  )
}

export { SearchInput }
