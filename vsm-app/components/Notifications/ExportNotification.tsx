import { JOB_STATUS } from '@/constants'
import JobsService from '@/services/frontend/JobsService'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { MenuItem, Box, Typography, Link, ListItemIcon, Stack } from '@mui/material'
import { toast } from 'react-toastify'
import DownloadIcon from '@mui/icons-material/Download'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { ExportJobMetadata, JobData } from '@/types/jobTypes'
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
  let additionalData = {} as any
  try {
    additionalData = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  } catch (e) {
    console.error(e)
  }
  const programTitle = additionalData?.programTitle || 'program'
  const fileType = additionalData?.fileType ? additionalData.fileType.toUpperCase() : ''
  const errorMessage = jobDetails?.error
  const version = additionalData?.version
  const hasCustomPlanDefinition = additionalData?.hasCustomPlanDefinition

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
              Preparing {fileType} {programTitle} for download
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
              Export for {fileType} {version} {programTitle} failed
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
                {fileType} {version} {programTitle} is ready for download
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
  // create anchor HTML element with href to file
  const link = document.createElement('a')
  link.href = href
  link.download = `${filename}`
  document.body.appendChild(link)
  link.click()

  // clean up anchor element & remove ObjectURL
  document.body.removeChild(link)
  URL.revokeObjectURL(href)
}

const ExportNotification = ({ jobId, jobDetails, closeNotification }: Props) => {
  const downloadExport = async () => {
    const job = await JobsService.getExportJob(jobId);
    const packageData = job?.returnvalue?.response?.data;
    const validationResults = job?.returnvalue?.validationResults;
    try {
      const fileMetaData = jobDetails?.metadata as ExportJobMetadata;
      const filename = fileMetaData?.filename
      switch(fileMetaData?.fileType){
        case 'csv':
          downloadTextData(packageData, 'txt', filename || 'export.csv');
          break;
        case 'json':
          downloadTextData(JSON.stringify(packageData, null, 2), 'application/fhir+json', filename || 'export.json');
          break;
        case 'xml':
          downloadTextData(packageData, 'application/fhir+xml', filename || 'export.xml');
          break;
        default:
          if (validationResults.length > 0) {
            const programTitle = fileMetaData?.programTitle || 'program';
            downloadTextData(validationResults.sort().join('\n\n'), 'txt', `${programTitle}_validationResults.txt`)
          }
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
