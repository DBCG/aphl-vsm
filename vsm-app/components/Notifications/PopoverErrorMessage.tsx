import { Typography, Popover } from '@mui/material'
import React from 'react'

const PopOverErrorMessage = ({ errorMessage }: { errorMessage: string }) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handlePopoverClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  return (
    <>
      <Typography
        variant="caption"
        color="error"
        sx={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
        aria-owns={open ? 'mouse-over-popover' : undefined}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {errorMessage}
      </Typography>

      <Popover
        id="mouse-over-popover"
        sx={{ pointerEvents: 'none', width: '500px' }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Typography variant="caption" color="error" sx={{ p: 1 }}>
          {errorMessage}
        </Typography>
      </Popover>
    </>
  )
}

export default PopOverErrorMessage
