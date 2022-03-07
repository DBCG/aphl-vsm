import styled from 'styled-components'

const Input = styled.input`
  min-width: 400px;
  padding: 4px 6px;
`

const SearchInput = ({ placeholder }) => {
  return (
    <Input
      placeholder={placeholder}
    />
  )
}

export { SearchInput }