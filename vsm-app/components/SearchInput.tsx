import styled from 'styled-components'

interface InputProps {
  minWidth?: number;
  onChange: React.ChangeEventHandler<React.ChangeEvent>;
}

const Input = styled.input<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

interface LabelProps {
  for: string;
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
  onChange?: Function,
  label?: string,
  id?: string,
  minWidth?: number,
  hasIcon?: boolean
}

interface LabelProps {
  for: string
}

const SearchInput = ({
  placeholder,
  onChange,
  label,
  id,
  minWidth
}: Props) => {
  return (
    <Container>
      {
        (label !== undefined && id  !== undefined) &&
        <StyledLabel for={id}>
          {label}
        </StyledLabel>
      }
      <Input
        placeholder={placeholder}
        onChange={onChange}
        minWidth={minWidth}
      />
    </Container>
  )
}

export { SearchInput }