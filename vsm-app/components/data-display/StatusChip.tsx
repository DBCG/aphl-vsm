import { styled } from '@mui/system'
import Chip from '@mui/material/Chip'

interface Chip {
  label: string
}

const StyledChip = styled(Chip)`
  font-size: 80%;
  background-color: ${(props) =>
    typeof props.label === 'string' && props?.label?.toLowerCase() === 'active' ? 'rgba(46, 192, 205, 0.3)' : 'rgba(252, 186, 3, 0.3)'};
`

const StatusChip = ({ label }: Chip) => {
  return <StyledChip label={label.toUpperCase()} />
}

export { StatusChip }
