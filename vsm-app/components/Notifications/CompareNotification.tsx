import { JOB_STATUS } from '@/constants'
import { JobData } from '@/types/jobTypes'
import { Typography, Button, Link, ListItemIcon, Stack } from '@mui/material'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { toast } from 'react-toastify'

type Props = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

type StatusActionNotificationProps = {
  jobDetails: JobData
  closeNotification: () => void
}

interface NotificationProps {
  styles?: React.CSSProperties
}

const NotificationContainer = styled.div<NotificationProps>`
  display: flex;
  padding: 1rem;
  max-width: 300px;
`

const copyText = (txt: string) => navigator.clipboard.writeText(txt)

const StatusActionNotification = ({ jobDetails, closeNotification }: StatusActionNotificationProps) => {
  const { baseProgramId, targetProgramId } = jobDetails.metadata
  const router = useRouter()
  const jobStatus = jobDetails.status
  const errorMessage = jobDetails?.error || ''
  let display

  switch (jobStatus) {
    case JOB_STATUS.IN_PROGRESS:
      display = (
        <NotificationContainer>
          <ListItemIcon>
            <PendingIcon fontSize="small" />
          </ListItemIcon>
          <Stack>
            <Typography variant="body1">Generating Change Log</Typography>
          </Stack>
        </NotificationContainer>
      )
      break
    case JOB_STATUS.FAILED:
      display = (
        <NotificationContainer
          styles={{ display: 'flex', cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault()
            toast.success('Copied errors to clipboard', { autoClose: 1000 })
            copyText(errorMessage || '')
          }}
        >
          <ListItemIcon>
            <ErrorOutlineIcon fontSize="small" />
          </ListItemIcon>
          <Stack>
          <ContentCopyIcon style={{ color: 'gray', alignSelf: 'flex-end' }}/>
            <Typography variant="body1">Change Log has failed</Typography>
            <Typography sx={{textWrap: 'wrap'}} variant="caption" color="error">
              {errorMessage}
            </Typography>
          </Stack>
        </NotificationContainer>
      )
      break
    default:
      display = (
        <NotificationContainer>
          <ListItemIcon>
            <CompareArrowsIcon />
          </ListItemIcon>
          <Link onClick={() => {}}>
            <Stack>
              <Typography variant="body1">Change Log has been generated for the selected programs</Typography>
              <Typography variant="caption">Base Program: {baseProgramId}</Typography>
              <Typography variant="caption">Target Program: {targetProgramId}</Typography>
              <Button
                onClick={() => {
                  closeNotification()
                  router.push(`programs/compare?old=${baseProgramId}&new=${targetProgramId}`)
                }}
                variant="contained"
                color="primary"
              >
                View Change Log
              </Button>
            </Stack>
          </Link>
        </NotificationContainer>
      )
  }
  return <div style={{ cursor: jobStatus === JOB_STATUS.FAILED ? 'pointer' : 'unset' }}>{display}</div>
}

const CompareNotification = ({ jobId, jobDetails, closeNotification }: Props) => {
  return <StatusActionNotification key={jobId} jobDetails={jobDetails} closeNotification={closeNotification} />
}

export default CompareNotification
