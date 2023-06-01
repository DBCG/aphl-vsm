import styled from 'styled-components'
import Btn, { ButtonProps } from '@mui/material/Button'

const StyledBtn = styled(Btn)<ButtonProps>`
  height: fit-content;
`

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  btnType?: string
  style?: React.CSSProperties
  ['data-modal']?: string
}

const Button = ({ text, style, disabled, onClick = () => {}, ...props }: BtnProps & ButtonProps) => {
  return (
    <StyledBtn
      {...props}
      style={style}
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
