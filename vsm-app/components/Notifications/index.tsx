import { Badge, Box, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material'
import { useState, useEffect } from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import DeleteIcon from '@mui/icons-material/Delete'
import { toast } from 'react-toastify'
import { Jobs, JobData } from '@/types/jobTypes'

// Notifications
import CompareNotification from './CompareNotification'
import ExportNotification from './ExportNotification'
import ReleaseNotification from './ReleaseNotification'

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

  //@ts-ignore
  const sortedJobs = Object.entries(jobs).sort((a,b) => a?.[0] - b?.[0])

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
          switch (jobDetails.type as string) {
            case JOB_TYPE.CHANGE_LOG:
              return (
                <Box key={jobId}>
                  <CompareNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose}  />
                  <hr />
                </Box>
              )
            case JOB_TYPE.EXPORT:
              return (
                <Box key={jobId}>
                  <ExportNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
                  <hr />
                </Box>
              )
            case JOB_TYPE.RELEASE:
              return (
                <Box key={jobId}>
                  <ReleaseNotification jobId={jobId} jobDetails={jobDetails} closeNotification={handleClose} />
                  <hr />
                </Box>
              )
            default:
              return null
          }
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
