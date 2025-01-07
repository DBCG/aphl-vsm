import { JOB_STATUS } from '@/constants'
import JobsService from '@/services/frontend/JobsService'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { MenuItem, Box, Typography, Link, ListItemIcon, Stack } from '@mui/material'
import { toast } from 'react-toastify'
import DownloadIcon from '@mui/icons-material/Download'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { JobData } from '@/types/jobTypes'
import PopOverErrorMessage from './PopoverErrorMessage'

type Props = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

type StatusActionNotificationProps = {
  jobDetails: JobData
  downloadExport: () => void
}

const copyText = (txt: string) => navigator.clipboard.writeText(txt)

const StatusActionNotification = ({ jobDetails, downloadExport }: StatusActionNotificationProps) => {
  const { status: jobStatus, metadata } = jobDetails
  const programTitle = metadata?.programTitle || 'program'
  const type = metadata?.isJson ? 'JSON' : 'XML'
  const errorMessage = jobDetails?.error
  const version = metadata?.version
  const hasCustomPlanDefinition = metadata?.hasCustomPlanDefinition

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
              Preparing {type} {version} {programTitle} for download
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
            <Typography variant="body1" sx={{fontSize: '14px'}}>
              Export for {type} {version} {programTitle} failed
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
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <Link onClick={downloadExport}>
            <Stack>
              <Typography variant="body1">
                {type} {version} {programTitle} is ready for download
              </Typography>
              {hasCustomPlanDefinition && <Typography variant="caption">Custom Plan Definition was used</Typography>}
            </Stack>
          </Link>
        </Box>
      )
  }
  return <>{display}</>
}

const downloadTextData = (data: string, type: `${string}${'json' | 'xml' | 'txt'}`, filename: string) => {
  // https://stackoverflow.com/a/55613750/8144343
  const blob = new Blob([data], { type: type })
  const href = URL.createObjectURL(blob)
  // create "a" HTLM element with href to file
  const link = document.createElement('a')
  link.href = href
  link.download = `${filename}`
  document.body.appendChild(link)
  link.click()

  // clean up "a" element & remove ObjectURL
  document.body.removeChild(link)
  URL.revokeObjectURL(href)
}

const ExportNotification = ({ jobId, jobDetails, closeNotification }: Props) => {
  const downloadExport = async () => {
    const job = await JobsService.getJob(jobId)
    const packageResponse = job?.returnvalue?.response
    const validationResults = job?.returnvalue?.validationResults
    try {
      if (typeof packageResponse === 'string' && packageResponse.startsWith('<Bundle')) {
        downloadTextData(packageResponse, 'application/fhir+xml', jobDetails?.metadata?.filename)
      } else if (typeof packageResponse === 'object' && packageResponse.resourceType === 'Bundle') {
        downloadTextData(JSON.stringify(packageResponse, null, 2), 'application/fhir+json', jobDetails?.metadata?.filename)
      }
      if (validationResults.length > 0) {
        downloadTextData(validationResults.sort().join('\n\n'), 'txt', `${jobDetails?.metadata?.programTitle}_validationResults.txt`)
      }
    } catch (error) {
      toast.error('Error downloading file: ' + error)
    } finally {
      closeNotification()
    }
  }

  return (
    <MenuItem>
      <Box>
        <StatusActionNotification jobDetails={jobDetails} downloadExport={downloadExport} />
      </Box>
    </MenuItem>
  )
}

export default ExportNotification
