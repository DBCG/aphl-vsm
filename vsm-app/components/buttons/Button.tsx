import styled from 'styled-components'
import Btn from '@mui/material/Button'

const StyledBtn = styled(Btn)`
  height: fit-content;
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  btnType?: string
  style?: React.CSSProperties
}

const Button = ({ text, style, disabled, onClick = () => {}, ...props }: ButtonProps) => {
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
