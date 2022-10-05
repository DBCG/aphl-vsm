import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: ${props => props.disabled ? 'white !important' : 'var(--theme-300)'};
  color: ${props => props.disabled ? '#B0B5C1' : 'white !important'};
  font-weight: 600;
  border: none;
  padding: 8px 8px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};;
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
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) {
          onClick(e)
        }
      }}
    >
      { text }
    </StyledButton>
  )
}

export { Button }