import { styled } from '@mui/system'
import Image from 'next/image'
import ScienceIcon from '@mui/icons-material/Science';
import { Box } from '@mui/material'
import Tt from '@mui/material/Tooltip'

interface IsExperimental {
  experimental: boolean
}

const Banner = styled(Box)<IsExperimental>`
  position: absolute;
  top: 0;
  font-size: 80%;
  width: 100%;
  padding: 4px 8px;
  width: 100%;
  white-space: nowrap;
  text-align: center;
  background-color: ${(props) =>
    props.experimental ? '#81c951' : 'none'
  };
`

const ExperimentalBanner = ({ experimental }: IsExperimental) => {
  return (
    <Tt placement='top' title='Experimental programs rely on resources that may be subject to change.'>
      <Banner experimental={experimental}>
        Experimental
        <ScienceIcon fontSize='12px' style={{ transform: 'translateY(1px)'}}/>
        {/* <Image width={16} height={16} alt="" src="/images/information-circle.svg" /> */}
      </Banner>
    </Tt>
  )

}

export { ExperimentalBanner }