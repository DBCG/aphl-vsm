import styled from 'styled-components'

interface InputProps {
  minWidth?: number;
  minHeight?: number;
  onChange: React.ChangeEventHandler | undefined;
}

const Input = styled.textarea<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

interface LabelProps {
  children: string;
}

const StyledLabel = styled.label<LabelProps>`
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--theme-500);
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  placeholder?: string,
  onChange?: React.ChangeEventHandler,
  label?: string,
  id?: string,
  minWidth?: number,
  minHeight?: number,
  hasIcon?: boolean
}

interface LabelProps {
  for: string
}

const TextArea = ({
  placeholder,
  onChange,
  label,
  id,
  minWidth,
  minHeight
}: Props) => {
  return (
    <Container>
      {
        (label !== undefined && id !== undefined) &&
        <StyledLabel for={id}>
          {label}
        </StyledLabel>
      }
      <Input
        name={id}
        placeholder={placeholder}
        onChange={onChange}
        minWidth={minWidth}
        minHeight={minHeight}
      />
    </Container>
  )
}

export { TextArea }