import styled from 'styled-components'

const StyledButton = styled.button`
`

interface Props {
  text: string
}

const Button = ({ text }: Props) => {
  return (
    <StyledButton>{ text }</StyledButton>
  )
}

export { Button }