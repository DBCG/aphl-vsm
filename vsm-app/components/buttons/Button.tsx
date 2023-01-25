import styled from 'styled-components'

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hide: boolean
}

const StyledButton = styled.button<StyledButtonProps>`
  display: ${props => props.hide ? 'none' : 'inherit'};
  background-color: ${props => props.disabled
  ? 'lightgray !important'
  : 'var(--theme-300)'}; 
  color: ${props => props.disabled ? '#B0B5C1' : 'white !important'};
  font-weight: 600;
  height: fit-content;
  border: none;
  padding: 8px 8px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  &:hover {
    background-color: ${props => props.disabled ? 'lightgray !important' : 'var(--warning-medium) !important'};
  };
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  btnType?:  string
  style?: React.CSSProperties,
  hide?: boolean
}

const Button = ({
  text,
  style,
  disabled,
  onClick=() => {},
  hide=false
}: ButtonProps) => {
  return (
    <StyledButton
      hide={hide}
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