import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: ${props => props.disabled ? 'gray !important' : 'var(--theme-300)'};
  color: var(--white);
  font-weight: 600;
  border: none;
  padding: 8px 8px;
  cursor: pointer;
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  style?: React.CSSProperties
}

const Button = ({
  text,
  style,
  disabled,
  onClick=() => {},
}: ButtonProps) => {
  return (
    <StyledButton
      style={style}
      onClick={(e) => onClick(e)}
      disabled={disabled}
    >
      { text }
    </StyledButton>
  )
}

export { Button }