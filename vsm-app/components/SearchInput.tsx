import styled from 'styled-components'
import Image from 'next/image'

const Input = styled.input`
  min-width: 400px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-color);
`

const StyledLabel = styled.label`
  margin-bottom: 8px;
  font-size: 14px;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  placeholder?: string,
  onChange?: Function
}

const SearchInput = ({ placeholder, onChange, label, id }: Props) => {
  return (
    <Container>
      {label && <StyledLabel for={id}>{label}</StyledLabel>}
      <Input
        placeholder={placeholder}
        onChange={onChange}
      />
    </Container>
  )
}

export { SearchInput }