import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: var(--theme-300);
  color: var(--white);
  font-weight: 600;
  border: none;
  padding: 8px 8px;
  cursor: pointer;
  border-radius: 8px;
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  style?: React.CSSProperties
}

const TagButton = ({
  text,
  style,
  onClick=() => {},
}: ButtonProps) => {
  return (
    <StyledButton
      style={style}
      onClick={(e) => onClick(e)}
    >
      { text }
    </StyledButton>
  )
}

export { TagButton }