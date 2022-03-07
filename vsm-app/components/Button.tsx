import styled from 'styled-components'

const StyledButton = styled.button`
`

const Button = ({ text }) => {
  return (
    <StyledButton>{ text }</StyledButton>
  )
}

export { Button }