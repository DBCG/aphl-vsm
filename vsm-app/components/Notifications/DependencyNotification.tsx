import React from 'react'
import { JOB_STATUS } from '@/constants'
import { MenuItem, Box, Typography, ListItemIcon, Stack, LinearProgress, IconButton, Tooltip } from '@mui/material'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import { DependencyJobMetadata, JobData } from '@/types/jobTypes'
import PopOverErrorMessage from './PopoverErrorMessage'
import { useRouter } from 'next/router'
import JobsService from '@/services/frontend/JobsService'
import NotificationStore from '@/store/NotificationStore'
import { toast } from 'react-toastify'

type Props = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

type StatusActionNotificationProps = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

const StatusActionNotification = ({ jobId, jobDetails, closeNotification }: StatusActionNotificationProps) => {
  const router = useRouter()
  const { status: jobStatus, metadata } = jobDetails
  let additionalData = {} as any
  try {
    additionalData = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  } catch (e) {
    console.error(e)
  }

  const igPackageId = additionalData?.igPackageId || 'Unknown IG'
  const errorMessage = jobDetails?.error

  // Get progress info from job
  const [progress, setProgress] = React.useState<any>(null)

  React.useEffect(() => {
    if (jobStatus === JOB_STATUS.IN_PROGRESS) {
      // Poll for progress updates
      const pollProgress = async () => {
        try {
          const job = await JobsService.getExportJob(jobId)
          if (job?.progress) {
            setProgress(job.progress)
          }
        } catch (e) {
          console.error('Failed to fetch progress:', e)
        }
      }

      // Initial fetch
      pollProgress()

      // Poll every 5 seconds
      const interval = setInterval(pollProgress, 5000)
      return () => clearInterval(interval)
    } else {
      // Job is completed or failed, stop polling and clear progress
      setProgress(null)
    }
  }, [jobId, jobStatus])

  const handleClick = async () => {
    if (jobStatus === 'FAILED') {
      return // Don't navigate on failed jobs
    }

    // Get the full job result from the API
    const job = await JobsService.getExportJob(jobId)
    const result = job?.returnvalue || {}

    console.log('DependencyNotification: Job data:', job)
    console.log('DependencyNotification: Result:', result)
    console.log('DependencyNotification: Additional data (metadata):', additionalData)

    // Store the data in sessionStorage to pre-fill modal
    const modalData = {
      jobId: jobId, // Include job ID so modal can remove notification when VSP is created
      igCanonical: additionalData?.igCanonical,
      igPackageId: additionalData?.igPackageId,
      igName: result?.igName || additionalData?.igName,
      igTitle: result?.igTitle || additionalData?.igTitle,
      manifestData: result?.manifestData || additionalData?.manifestData,
      source: result?.source || additionalData?.source,
      warnings: result?.warnings || additionalData?.warnings
    }

    console.log('DependencyNotification: Storing modal data:', modalData)
    sessionStorage.setItem('vsp-create-data', JSON.stringify(modalData))

    // Navigate to VSP page and trigger modal
    router.push('/programs?resourceType=vsp&action=create')
    closeNotification()
  }

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await NotificationStore.cancelJob(jobId)
    if (success) {
      toast.success('Job cancelled successfully')
    } else {
      toast.error('Failed to cancel job')
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    NotificationStore.removeJob(jobId)
    toast.success('Notification removed')
  }

  // Calculate progress percentage
  const getProgressPercent = () => {
    if (!progress || typeof progress === 'number') {
      return progress || 0
    }
    if (progress.current && progress.total) {
      return Math.round((progress.current / progress.total) * 100)
    }
    return 0
  }

  const getProgressStep = () => {
    if (!progress || typeof progress === 'number') {
      return 'Processing...'
    }
    return progress.step || 'Processing...'
  }

  const progressPercent = getProgressPercent()
  const progressStep = getProgressStep()

  let display
  switch (jobStatus) {
    case JOB_STATUS.IN_PROGRESS:
      display = (
        <Box
          sx={{ display: 'flex', cursor: 'pointer', width: '100%', alignItems: 'flex-start' }}
          onClick={handleClick}
        >
          <ListItemIcon>
            <PendingIcon fontSize="small" />
          </ListItemIcon>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="body1">
              Fetching dependencies for {igPackageId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {progressStep}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ flex: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                {progressPercent}%
              </Typography>
            </Box>
            <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
              Click to view progress
            </Typography>
          </Stack>
          <Tooltip title="Cancel job">
            <IconButton
              size="small"
              onClick={handleCancel}
              sx={{ ml: 1 }}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
      break
    case JOB_STATUS.FAILED:
      display = (
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <ListItemIcon>
            <ErrorOutlineIcon fontSize="small" />
          </ListItemIcon>
          <Stack sx={{ maxWidth: '300px', flex: 1 }}>
            <Typography variant="body1" sx={{ fontSize: '14px' }}>
              Failed to fetch dependencies for {igPackageId}
            </Typography>
            <PopOverErrorMessage errorMessage={errorMessage || 'Unknown error'} />
          </Stack>
          <Tooltip title="Remove notification">
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{ ml: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
      break
    default:
      display = (
        <Box
          sx={{ display: 'flex', cursor: 'pointer', alignItems: 'flex-start' }}
          onClick={handleClick}
        >
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" color="success" />
          </ListItemIcon>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="body1" color="primary">
              Dependencies ready for {igPackageId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click to continue creating VSP
            </Typography>
          </Stack>
          <Tooltip title="Remove notification">
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{ ml: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
  }
  return <>{display}</>
}

const DependencyNotification = ({ jobId, jobDetails, closeNotification }: Props) => {
  return (
    <MenuItem>
      <Box>
        <StatusActionNotification
          jobId={jobId}
          jobDetails={jobDetails}
          closeNotification={closeNotification}
        />
      </Box>
    </MenuItem>
  )
}

export default DependencyNotification
