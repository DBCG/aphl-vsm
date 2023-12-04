import { styled } from '@mui/system'
import { Box } from '@mui/material'

interface IsExperimental {
  experimental: boolean
}

const Banner = styled(Box)`
  display: ${(props) => props.experimental ? 'inherit' : 'none'}
  font-size: 80%;
  background-color: ${(props) =>
    props.experimental ? 'rgba(46, 192, 205, 0.3)' : 'rgba(252, 186, 3, 0.3)'};
`

const ExperimentalBanner = ({ experimental }: IsExperimental) => {
  return (
    <Banner experimental={experimental}>
      This program is Experimental
    </Banner>
  )

}

export { ExperimentalBanner }