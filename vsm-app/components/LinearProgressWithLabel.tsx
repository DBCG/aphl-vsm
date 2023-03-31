import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ...(props.sx || {}) }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={props.value} />
        <Typography sx={{ alignSelf: 'center' }} variant="body2" color="text.secondary">{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  )
}

export default LinearProgressWithLabel
