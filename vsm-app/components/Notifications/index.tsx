import { Badge, Box, IconButton, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material'
import { useState, useEffect } from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { toast } from 'react-toastify'
import { Jobs, JobData } from '@/types/jobTypes'
import { compareJobsByCreation } from '@/helpers/notificationHelpers'

// Notifications
import CompareNotification from './CompareNotification'
import ExportNotification from './ExportNotification'
import ReleaseNotification from './ReleaseNotification'
import DependencyNotification from './DependencyNotification'

const convertMetadataToObj = (job: JobData) => {
  if (typeof job?.metadata === 'string') {
    try {
      const objMetadata =  JSON.parse(job.metadata)
      job.metadata = objMetadata
    } catch (e) {
      console.error(e)}
  }
  return job
}

const Notifications = () => {
  const [jobs, setJobs] = useState<Jobs>({})
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  useEffect(() => {
    NotificationStore.subscribe(setJobs)
    NotificationStore.init()
  }, [])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleClearNotifications = () => {
    NotificationStore.clearJobs()
    toast.success('All notifications cleared')
  }

  // Order by creation time (call order); see compareJobsByCreation for why id order is wrong.
  const sortedJobs = Object.entries(jobs).sort(compareJobsByCreation)

  return (
    <Box>
      <Badge sx={{ mr: 3 }} onClick={handleClick} badgeContent={Object.keys(jobs)?.length} color="primary">
        <NotificationsIcon color="action" />
      </Badge>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
      >
        {sortedJobs.map(([jobId, jobDetails]) => {
          jobDetails = convertMetadataToObj(jobDetails)
          let notification: JSX.Element | null = null
          switch (jobDetails.type as string) {
            case JOB_TYPE.CHANGE_LOG:
              notification = <CompareNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
              break
            case JOB_TYPE.EXPORT:
              notification = <ExportNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
              break
            case JOB_TYPE.RELEASE:
              notification = <ReleaseNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
              break
            case JOB_TYPE.FETCH_DEPENDENCIES:
              notification = <DependencyNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
              break
            default:
              return null
          }
          // Dependency notifications already provide their own remove/cancel controls,
          // so only add the uniform remove "X" for the other notification types.
          const showRemove = jobDetails.type !== JOB_TYPE.FETCH_DEPENDENCIES
          return (
            <Box key={jobId}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>{notification}</Box>
                {showRemove && (
                  <IconButton
                    size="small"
                    aria-label="Remove notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      NotificationStore.removeJob(jobId)
                    }}
                    sx={{ mr: 1 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <hr />
            </Box>
          )
        })}
        {Object.keys(jobs)?.length === 0 ? (
          <MenuItem>No notifications</MenuItem>
        ) : (
          <MenuItem onClick={handleClearNotifications}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <Typography>Clear all</Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}

export default Notifications
