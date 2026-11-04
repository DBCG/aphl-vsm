import React, { useState, useEffect } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  FormControlLabel,
  FormGroup,
  Switch,
  Stack,
  Typography,
  Radio,
  RadioGroup
} from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { toast } from 'react-toastify'
import type { ExpectedPackageBody } from '@/pages/api/programs/[id]/package'
import { ModalContent } from '@/styles/modal'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import dayjs from 'dayjs';
import { ExportJobMetadata } from '@/types/jobTypes'
import { apiFetch } from '@/utils'
import { findUnversionedManifestRefs } from '@/helpers/valueSetHelpers'
import ConfirmUnversionedRefsModal from '@/components/modals/ConfirmUnversionedRefsModal'

interface ModalInfo {
  isOpen: boolean
  program: fhir4.Library
  toggleModalOpen: () => void
  setExportError: (error: any) => void
  resourceType?: 'program' | 'vsp' // NEW: specify if it's a Program or VSP
}

interface BodyFormatter {
  isJson: boolean
}

interface PackageParams extends BodyFormatter {
  programId: string
  metadata: any
  resourceType?: 'program' | 'vsp'
}

const packageProgram = async ({ isJson, programId, metadata, resourceType = 'program' }: PackageParams) => {
  const bodyForPackage = formatBody({ isJson })
  bodyForPackage.metadata = metadata

  // Use different endpoint based on resource type
  const endpoint = resourceType === 'vsp'
    ? `/api/value-set-packages/${programId}/package`
    : `/api/programs/${programId}/package`

  return await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(bodyForPackage)
  })
}

const formatBody = ({ isJson }: BodyFormatter): ExpectedPackageBody['body'] => ({
  data: {
    parameters: {
      resourceType: 'Parameters'
    },
    json: isJson
  }
})

const ExportPackageDetailsModal = ({ isOpen, toggleModalOpen, program, setExportError, resourceType = 'program' }: ModalInfo) => {
  const [fileType, setFileType] = useState<'json' | 'xml' | 'csv'>('json')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [unversionedConfirmOpen, setUnversionedConfirmOpen] = useState(false)

  const unversionedRefs = resourceType === 'vsp'
    ? findUnversionedManifestRefs(program)
    : { codeSystems: [], valueSets: [] }
  const hasUnversionedRefs = unversionedRefs.codeSystems.length + unversionedRefs.valueSets.length > 0

  const handleResetState = () => {
    setFileType('json')
    setDownloadLoading(false)
  }

  useEffect(() => {
    handleResetState()
  }, [])

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
    handleResetState()
  }

  const handleExitExportModal = () => {
    toggleModalOpen()
    setTimeout(() => handleResetState(), 500) // Workaround to force state change
  }

  const onSuccessExport = () => {
    toast.success('Ready for download')
  }

  const onFailureExport = (error: string) => {
    const errorByTopic = {
      'Package Errors': [] as string[],
      'Server Errors': [] as string[],
      'Download Errors': [] as string[],
      'Validation Errors': [] as string[]
    }

    // early return if package fails will jump
    errorByTopic['Package Errors'].push(error)
    setExportError(errorByTopic)
    handleExitExportModal()
  }

  const handleClickExport = async () => {
    if (hasUnversionedRefs) {
      setUnversionedConfirmOpen(true)
      return
    }
    await runExport()
  }

  const runExport = async () => {
    setDownloadLoading(true)

    try {
      // first, remove special characters that are not - or _
      // next, replace all _ with -
      const specialCharRx = /[^a-zA-Z\d\s:\-_]/gi
      const spaceAndUnderscoreRx = /[\s_]/gi
      const fileTitle = (program?.title || program?.id || 'program').replaceAll(specialCharRx, '').replaceAll(spaceAndUnderscoreRx, '-')
      const fileExtension = fileType === 'csv' ? 'csv' : fileType === 'json' ? 'json' : 'xml'
      // Use the artifact's version in the filename; fall back to a timestamp if it has none (e.g. an unversioned draft).
      const formattedTimestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
      const fileVersion = (program?.version || formattedTimestamp).replaceAll(specialCharRx, '').replaceAll(spaceAndUnderscoreRx, '-')
      const filename = `${fileTitle}-bundle_${fileVersion}.${fileExtension}`

      const metadata: ExportJobMetadata = {
        programId: program.id!,
        programVersion: program?.version,
        fileType,
        filename,
        programTitle: program?.title!
      }
      toast.info('Exporting package. You will be notified when it is ready for download.')

      const jobResponse = await packageProgram({
        isJson: fileType === 'json' || fileType === 'csv',
        programId: program.id!,
        metadata,
        resourceType
      }).then((res) => res.json())

      if (jobResponse?.error) {
        setDownloadLoading(false)
        onFailureExport(jobResponse?.error)
        return
      }

      NotificationStore.addJob({
        jobId: jobResponse.id,
        jobType: JOB_TYPE.EXPORT,
        metadata,
        onSuccess: onSuccessExport,
        onFailure: onFailureExport
      })

      handleExitExportModal()
    } catch (error: any) {
      setDownloadLoading(false)
      toast.error(`Export failed: ${error.message || 'Unknown error'}`)
      handleExitExportModal()
    }
  }

  return (
    <>
    <ConfirmUnversionedRefsModal
      isOpen={unversionedConfirmOpen}
      action="export"
      codeSystems={unversionedRefs.codeSystems}
      valueSets={unversionedRefs.valueSets}
      confirmLoading={downloadLoading}
      onCancel={() => setUnversionedConfirmOpen(false)}
      onConfirm={async () => {
        setUnversionedConfirmOpen(false)
        await runExport()
      }}
    />
    <Dialog open={isOpen} onClose={handleResetState}>
      <ModalContent style={{ minWidth: '300px' }}>
        <DialogTitle sx={{ textAlign: 'left' }}>Export Options</DialogTitle>
        <DialogContent>
          <FormGroup>
            {resourceType === 'vsp' ? (
              <RadioGroup
                value={fileType}
                onChange={(e) => setFileType(e.target.value as 'json' | 'xml' | 'csv')}
              >
                <FormControlLabel value="json" control={<Radio />} label="JSON" />
                <FormControlLabel value="xml" control={<Radio />} label="XML" />
                <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              </RadioGroup>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>XML</Typography>
                <Switch
                  defaultChecked={true}
                  data-switch={'file-type'}
                  onChange={(e) => setFileType(e?.target?.checked ? 'json' : 'xml')}
                  sx={{
                    '& .MuiSwitch-thumb, & .MuiSwitch-track': { backgroundColor: 'var(--theme-300)' }
                  }}
                />
                <Typography>JSON</Typography>
              </Stack>
            )}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button style={{ color: 'gray !important' }} onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton loading={downloadLoading} disabled={downloadLoading} data-modal={'Download'} onClick={handleClickExport}>
            Download
          </LoadingButton>
        </DialogActions>
      </ModalContent>
    </Dialog>
    </>
  )
}

export { ExportPackageDetailsModal }
