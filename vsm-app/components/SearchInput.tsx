import styled from 'styled-components'

const Input = styled.input`
  min-width: 400px;
  padding: 4px 6px;
`

interface Props {
  placeholder?: string,
  onChange?: Function
}

const SearchInput = ({ placeholder, onChange }: Props) => {
  return (
    <Input
      placeholder={placeholder}
      onChange={onChange}
    />
  )
}

export { SearchInput }