import { styled } from '@mui/system'
import Chip from '@mui/material/Chip'
import Tt from '@mui/material/Tooltip'
import ScienceIcon from '@mui/icons-material/Science'
import React from 'react'

interface Chip {
  label: string
  style: React.CSSProperties
  experimental: boolean
}

const StyledChip = styled(Chip)`
  font-size: 80%;
  width: fit-content;
  background-color: ${(props) =>
    typeof props.label === 'string' && props?.label?.toLowerCase() === 'active' ? 'rgba(46, 192, 205, 0.3)' : 'rgba(252, 186, 3, 0.3)'};
`

const StatusChip = ({ label, style, experimental=false }: Chip) => {
  const chip = (
    <StyledChip
      style={style}
      label={label.toUpperCase()}
      icon={experimental ? <ScienceIcon style={{ transform: 'translateX(4px)' }}/> : undefined}
    />
  )

  if (!experimental) return chip

  return (
    <Tt
      placement='top'
      title='Experimental programs rely on resources that may be subject to change.'
    >
      {chip}
    </Tt>
  )
}

export { StatusChip }
