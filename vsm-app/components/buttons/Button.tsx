import styled from 'styled-components'
import Btn, { ButtonProps } from '@mui/material/Button'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import { CircularProgress } from '@mui/material'

const StyledBtn = styled(Btn)<ButtonProps>`
  height: fit-content;
  transition: width 500ms;
  background-color: ${props => props.disabled ? 'lightgray' : 'auto'};
`

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  btnType?: string
  style?: React.CSSProperties
  ['data-modal']?: string
  loading?: boolean
}

const Button = ({ text, style, loading, disabled, onClick = () => {}, ...props }: BtnProps & ButtonProps) => {

  const icon = text === 'Release' ? (
    <NewReleasesIcon style={{  marginRight: '.2em' }}/>
  ) : null

  const generateIcon = () => {
    if(loading) {
      return <CircularProgress color='inherit' style={{  marginRight: '.5em', width: '20px', height: '20px' }}/>
    }

    if (text !== 'Release') {
      return null
    }
  
    if (text === 'Release') {
      return <NewReleasesIcon style={{  marginRight: '.2em' }}/>
    }
    return null
  }

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
      {generateIcon()}{text}
    </StyledBtn>
  )
}

export { Button }
