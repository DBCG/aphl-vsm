import styled from 'styled-components'

interface InputProps {
  minWidth?: number;
  onChange: React.ChangeEventHandler | undefined;
}

const Input = styled.input<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

const StyledLabel = styled.label`
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
  hasIcon?: boolean
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
        (label !== undefined && id !== undefined) &&
        <StyledLabel>
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