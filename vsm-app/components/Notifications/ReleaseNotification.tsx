import { JOB_STATUS } from '@/constants'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { MenuItem, Box, Typography, Link, ListItemIcon, Stack } from '@mui/material'
import { toast } from 'react-toastify'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { JobData } from '@/types/jobTypes'
import PopOverErrorMessage from './PopoverErrorMessage'
import { useRouter } from 'next/router'
import { DoneOutline } from '@mui/icons-material'
type Props = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

type StatusActionNotificationProps = {
  jobDetails: JobData
}

const copyText = (txt: string) => navigator.clipboard.writeText(txt)

const StatusActionNotification = ({ jobDetails }: StatusActionNotificationProps) => {
  const { status: jobStatus, metadata } = jobDetails
  const router = useRouter();
  let additionalData = {} as any
  try {
    additionalData = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  } catch (e) {
    console.error(e)
  }
  const programTitle = additionalData?.programTitle || 'program'
  const programId = additionalData?.programId || ''
  const errorMessage = jobDetails?.error

  let display
  switch (jobStatus) {
    case JOB_STATUS.IN_PROGRESS:
      display = (
        <Box sx={{ display: 'flex' }}>
          <ListItemIcon>
            <PendingIcon fontSize="small" />
          </ListItemIcon>
          <Stack>
            <Typography variant="body1">
              Program &quot;{programTitle}&quot; is being released
            </Typography>
          </Stack>
        </Box>
      )
      break
    case JOB_STATUS.FAILED:
      display = (
        <Box
          sx={{ display: 'flex', cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault()
            toast.success('Copied errors to clipboard', { autoClose: 1000 })
            copyText(errorMessage || '')
          }}
        >
          <ListItemIcon>
            <ErrorOutlineIcon fontSize="small" />
          </ListItemIcon>
          <Stack sx={{ maxWidth: '300px' }}>
            <Typography variant="body1" sx={{ fontSize: '14px' }}>
              Program release failed for &quot;{programTitle}&quot;
            </Typography>
            <PopOverErrorMessage errorMessage={errorMessage || ''} />
          </Stack>
          <ContentCopyIcon style={{ color: 'gray', alignSelf: 'flex-end' }} />
        </Box>
      )
      break
    default:
      display = (
        <Box sx={{ display: 'flex' }}>
          <ListItemIcon>
            <DoneOutline fontSize="small" />
          </ListItemIcon>
          <Link onClick={() => router.push(`/programs/${programId}`)}>
            <Stack>
              <Typography variant="body1">
                &quot;{programTitle}&quot; release operation is Complete
              </Typography>
            </Stack>
          </Link>
        </Box>
      )
  }
  return <>{display}</>
}

const ReleaseNotification = ({ jobId, jobDetails, closeNotification }: Props) => {


  return (
    <MenuItem>
      <Box>
        <StatusActionNotification jobDetails={jobDetails} />
      </Box>
    </MenuItem>
  )
}

export default ReleaseNotification
