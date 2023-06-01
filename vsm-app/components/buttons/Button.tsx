import styled from 'styled-components'
import Btn from '@mui/material/Button'

const StyledBtn = styled(Btn)<ButtonProps>`
  height: fit-content;
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  btnType?: string
  style?: React.CSSProperties
  ['data-modal']?: string
}

const Button = ({ text, id, type, style, disabled, onClick = () => {} }: ButtonProps) => {
  return (
    <StyledBtn
      id={id}
      style={style}
      type={type}
      text={text}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) {
          onClick(e)
        }
      }}
    >
      {text}
    </StyledBtn>
  )
}

export { Button }
