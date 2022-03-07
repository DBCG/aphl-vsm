import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: var(--theme-color);
  color: var(--white);
  font-weight: 600;
  border: none;
  padding: 8px 8px;
  cursor: pointer;
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