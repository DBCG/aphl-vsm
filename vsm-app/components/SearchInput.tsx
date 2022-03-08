import styled from 'styled-components'

const Input = styled.input`
  min-width: 400px;
  padding: 4px 6px;
`

interface Props {
  placeholder?: string
}

const SearchInput = ({ placeholder }: Props) => {
  return (
    <Input
      placeholder={placeholder}
    />
  )
}

export { SearchInput }