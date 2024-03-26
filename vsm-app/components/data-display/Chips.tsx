import { styled } from '@mui/system'
import Chip from '@mui/material/Chip'
import Tt from '@mui/material/Tooltip'
import ScienceIcon from '@mui/icons-material/Science'
import WarningIcon from '@mui/icons-material/Warning'
import React from 'react'

interface StyledCh {
  experimental: Boolean
}

interface Chip {
  label: string
  style?: React.CSSProperties
  experimental: boolean
}

interface IChip {
  indicatorType: 'experimental' | 'provisional'
  style?: React.CSSProperties
  experimental: boolean
}

const StyledChip = styled(Chip)<StyledCh>`
  font-size: 80%;
  width: fit-content;
  color: ${props => props.experimental ? 'var(--theme-400)' : 'inherit'};
  color: var(--theme-400);
  background-color: ${(props) =>
    typeof props.label === 'string' && props?.label?.toLowerCase() === 'active' ? 'rgba(46, 192, 205, 0.3)' : 'var(--draft)'};
`

const StatusChip = ({ label, style, experimental=false }: Chip) => {
  const chip = (
    <StyledChip
      style={style}
      experimental={experimental}
      label={label.toUpperCase()}
      icon={experimental ? <ScienceIcon style={{ transform: 'translateX(4px)', color: 'var(--theme-400)' }}/> : undefined}
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

const IconChip = ({ style, experimental, indicatorType }: IChip) => {
  let inner
  let hoverText
  if (indicatorType === 'experimental' && experimental) {
    hoverText = 'Experimental programs rely on resources that may be subject to change.'
    inner = (
      <ScienceIcon style={style}/>
    )
  } else if (indicatorType === 'provisional') {
    hoverText = 'Experimental programs rely on resources that may be subject to change.'
    inner = (
      <WarningIcon style={style}/>
    )
  } else {
    return null
  }


  return (
    <Tt
      placement='top'
      title={hoverText}
    >
      {inner}
    </Tt>
  )
}


export { StatusChip, IconChip }
