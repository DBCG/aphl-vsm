import { styled } from '@mui/system'
import Image from 'next/image'
import { Box } from '@mui/material'
import Tt from '@mui/material/Tooltip'

interface IsExperimental {
  experimental: boolean
}

const Banner = styled(Box)<IsExperimental>`
  display: ${(props) => props.experimental ? 'flex' : 'none'};
  font-size: 80%;
  padding: 4px 8px;
  border-radius: 8px;
  margin-bottom: 4px;
  width: 100%;
  white-space: nowrap;
  background-color: ${(props) =>
    props.experimental ? 'var(--warning-medium)' : 'none'
  };
`

const ExperimentalBanner = ({ experimental }: IsExperimental) => {
  return (
    <Tt placement='top' title='Experimental programs rely on resources that may be subject to change.'>
      <Banner experimental={experimental}>
        Experimental
        <Image width={16} height={16} alt="" src="/images/information-circle.svg" />
      </Banner>
    </Tt>
  )

}

export { ExperimentalBanner }