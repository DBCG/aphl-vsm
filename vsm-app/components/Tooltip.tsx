import React from 'react'
import Image from 'next/image'
import Tt from '@mui/material/Tooltip'
import { IconButton } from '@mui/material'

interface Props {
  info?: string
}

const Tooltip = ({ info }: Props) => {
  return (
    <Tt placement="right" title={info}>
      <IconButton style={{ margin: '-24px 0 0 -10px' }}>
        <Image width={16} height={16} alt="" src="/images/information-circle.svg" />
      </IconButton>
    </Tt>
  )
}

export { Tooltip }
