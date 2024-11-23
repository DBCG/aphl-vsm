import { JOB_STATUS, JOB_TYPE } from '@/constants'
import JobsService, { JobData, Jobs } from '@/services/frontend/JobsService'
import { ValidateBody, ValidateErrorResponse } from '@/pages/api/programs/validate'
import { MenuItem, Box, Typography, Link, ListItemIcon, CircularProgress, Stack } from '@mui/material'

import { toast } from 'react-toastify'
import DownloadIcon from '@mui/icons-material/Download'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
type Props = {
  jobId: string
  jobDetails: JobData
  closeNotification: () => void
}

const validatePackage = async (pkgBundle: fhir4.Bundle | string) => {
  try {
    const body: ValidateBody['body'] = { pkg: pkgBundle }
    return await fetch(`/api/programs/validate`, {
      method: 'POST',
      body: JSON.stringify(body)
    }).then((res) => res.json() as Promise<ValidateErrorResponse>)
  } catch (e) {
    console.error('validate error: ', e)
    return { error: 'Unknown error occured while validating this program.' }
  }
}

type StatusActionNotificationProps = {
  jobStatus: string
  programTitle: string
  errorMessage?: string
  downloadExport: () => void
}

const StatusActionNotification = ({ jobStatus, programTitle, errorMessage, downloadExport }: StatusActionNotificationProps) => {
  let display
  switch (jobStatus) {
    case JOB_STATUS.IN_PROGRESS:
      display = (
        <Box sx={{ display: 'flex' }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body1">Preparing {programTitle} for download</Typography>
        </Box>
      )
      break
    case JOB_STATUS.FAILED:
      display = (
        <Box sx={{ display: 'flex' }}>
          <ListItemIcon>
            <ErrorOutlineIcon fontSize="small" />
          </ListItemIcon>
          <Stack>
          <Typography variant="body1">Export for {programTitle} failed</Typography>
          <Typography variant="caption" color="error">
            {errorMessage}
          </Typography>
          </Stack>
        </Box>
      )
      break
    default:
      display = (
        <>
          <ListItemIcon>
            <PendingIcon />
          </ListItemIcon>
          <Link onClick={downloadExport}>
            <Typography variant="body1">{programTitle} is ready for download</Typography>
          </Link>
        </>
      )
  }
  return <>{display}</>
}

const downloadTextData = (data: string, type: `${string}${'json' | 'xml'}`, filename: string) => {
  // https://stackoverflow.com/a/55613750/8144343
  const blob = new Blob([data], { type: type })
  const href = URL.createObjectURL(blob)
  // create "a" HTLM element with href to file
  const link = document.createElement('a')
  link.href = href
  const fileExtension = type.includes('json') ? 'json' : 'xml'
  link.download = `${filename}-bundle.${fileExtension}`
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

    const validationResult = await validatePackage(packageResponse)

    // document validation errors
    // if (validationResult?.error?.length) {
    //   const validationErrorStrings = validationResult.error
    //   if (typeof validationErrorStrings === 'string') {
    //     errorByTopic['Validation Errors'].push(validationErrorStrings)
    //   } else {
    //     errorByTopic['Validation Errors'].push(...validationErrorStrings)
    //   }
    // }

    try {
      if (typeof packageResponse === 'string' && packageResponse.startsWith('<Bundle')) {
        downloadTextData(packageResponse, 'application/fhir+xml', jobDetails?.metadata?.filename)
      } else if (typeof packageResponse === 'object' && packageResponse.resourceType === 'Bundle') {
        downloadTextData(JSON.stringify(packageResponse, null, 2), 'application/fhir+json', jobDetails?.metadata?.filename)
      } else {
        // errorByTopic['Download Errors'].push(`Could not download file in ${fileType.toUpperCase()} format`)
      }

      // const errorsExist = Boolean(Object.values(errorByTopic).filter((e) => Boolean(e?.length))?.length > 0)
      // if (errorsExist) {
      //   setExportError(errorByTopic)
      // }
    } catch (error) {
      toast.error('Error downloading file: ' + error)
      // errorByTopic['Download Errors'].push('File download failed')
      // setExportError(errorByTopic)
    } finally {
      closeNotification()
    }
  }
  const programTitle = jobDetails?.metadata?.programTitle || 'program'
  return (
    <MenuItem>
      <Box>
        <StatusActionNotification jobStatus={jobDetails.status} errorMessage={jobDetails.error} programTitle={programTitle} downloadExport={downloadExport} />
      </Box>
    </MenuItem>
  )
}

export default ExportNotification
