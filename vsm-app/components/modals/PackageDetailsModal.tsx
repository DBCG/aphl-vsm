import React, { ChangeEvent, useState, useEffect } from 'react'
import ClearIcon from '@mui/icons-material/Clear'
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
  RadioGroup,
  Input,
  InputLabel,
  Tooltip
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import LoadingButton from '@mui/lab/LoadingButton'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import type { ExpectedPackageBody } from '@/pages/api/programs/[id]/package'
import { ModalContent } from '@/styles/modal'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import dayjs from 'dayjs';

interface ModalInfo {
  isOpen: boolean
  program: fhir4.Library
  toggleModalOpen: () => void
  setExportError: (error: any) => void
}

interface BodyFormatter {
  isJson: boolean
  isV2: boolean
  targetVersion: string | undefined
  fileUploadContent: { content: fhir4.PlanDefinition } | undefined
}

interface PackageParams extends BodyFormatter {
  programId: string
  metadata: any
}

const packageProgram = async ({ isJson, isV2, targetVersion, fileUploadContent, programId, metadata }: PackageParams) => {
  const bodyForPackage = formatBody({
    isJson,
    isV2,
    targetVersion,
    fileUploadContent
  })
  bodyForPackage.metadata = metadata

  return await fetch(`/api/programs/${programId}/package`, {
    method: 'POST',
    body: JSON.stringify(bodyForPackage)
  })
}

const formatBody = ({ isJson, isV2, targetVersion, fileUploadContent }: BodyFormatter): ExpectedPackageBody['body'] => {
  const body: ExpectedPackageBody['body'] = {
    data: {
      parameters: {
        resourceType: 'Parameters'
      },
      json: isJson,
      useV2: isV2
    }
  }

  if (!isV2 && fileUploadContent) {
    body.planDefinition = fileUploadContent.content
    body.targetVersion = targetVersion
  }
  return body
}

const ExportPackageDetailsModal = ({ isOpen, toggleModalOpen, program, setExportError }: ModalInfo) => {
  const [fileType, setFileType] = useState<'json' | 'xml'>('json')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [versionRadioValue, setVersionRadioValue] = useState('v2')
  const [fileUploadContent, setFileUploadContent] = useState<undefined | { fileName: string; content: fhir4.PlanDefinition }>(undefined)
  const [targetVersion, setTargetVersion] = useState<string>('')
  const [inputError, setInputError] = useState<boolean>(false)

  const handleResetState = () => {
    setFileType('json')
    setDownloadLoading(false)
    setVersionRadioValue('v2')
    setFileUploadContent(undefined)
    setTargetVersion('')
    setInputError(false)
  }

  useEffect(() => {
    handleResetState()
  }, [])

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
    handleResetState()
  }

  const readFile = (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const result = JSON.parse(event?.target?.result as string)
          if (result.resourceType !== 'PlanDefinition') {
            toast.error(`${file?.name} is not a PlanDefinition Resource`)
            reject()
          }
          resolve(result)
        } catch (e) {
          toast.error('File is not valid JSON')
          reject()
        }
      }
      reader.onerror = () => reject()
      reader.readAsText(file)
    })
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
    setDownloadLoading(true)

    // first, remove special characters that are not - or _
    // next, replace all _ with -
    const specialCharRx = /[^a-zA-Z\d\s:\-_]/gi
    const spaceAndUnderscoreRx = /[\s_]/gi
    const fileTitle = (program?.title || program?.id || 'program').replaceAll(specialCharRx, '').replaceAll(spaceAndUnderscoreRx, '-')
    const fileExtension = fileType === 'json' ? 'json' : 'xml'
    const formattedTimestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    const filename = `${fileTitle}-bundle_${formattedTimestamp}.${fileExtension}`
    const metadata = {
      programId: program.id,
      version: versionRadioValue,
      hasCustomPlanDefinition: fileUploadContent != null,
      isJson: fileType === 'json',
      filename,
      programTitle: program?.title
    }
    toast.info('Exporting package. You will be notified when it is ready for download.')

    // TODO: rename this var
    const jobResponse = await packageProgram({
      isJson: fileType === 'json',
      isV2: versionRadioValue === 'v2',
      targetVersion,
      fileUploadContent,
      programId: program.id!,
      metadata
    }).then((res) => res.json())

    NotificationStore.addJob({
      jobId: jobResponse.id,
      jobType: JOB_TYPE.EXPORT,
      metadata,
      onSuccess: onSuccessExport,
      onFailure: onFailureExport
    })

    handleExitExportModal()
  }

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if ((e?.target?.files?.length ?? 0) > 1) {
      toast.error('Cannot upload more than 1 file at a time')
      setFileUploadContent(undefined)
      return
    }

    const file = e?.target?.files?.[0] as File
    const content = (await readFile(file)) as fhir4.PlanDefinition
    setFileUploadContent({ fileName: file?.name, content })
  }

  return (
    <Dialog open={isOpen} onClose={handleResetState}>
      <ModalContent style={{ minWidth: '300px' }}>
        <DialogTitle sx={{ textAlign: 'left' }}>Export Options</DialogTitle>
        <DialogContent>
          <FormGroup>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography>XML</Typography>
              {
                <Switch
                  defaultChecked={true}
                  data-switch={'file-type'}
                  onChange={(e) => setFileType(e?.target?.checked ? 'json' : 'xml')}
                  sx={{
                    '& .MuiSwitch-thumb, & .MuiSwitch-track': { backgroundColor: 'var(--theme-300)' }
                  }}
                />
              }
              <Typography>JSON</Typography>
            </Stack>
            <RadioGroup
              row
              value={versionRadioValue}
              name="radio-buttons-export-group"
              onChange={(e) => setVersionRadioValue(e?.target?.value)}
            >
              <FormControlLabel value="v1" control={<Radio />} label="V1" />
              <FormControlLabel value="v2" control={<Radio />} label="V2" />
            </RadioGroup>
          </FormGroup>
          {fileUploadContent && versionRadioValue === 'v1' && (
            <Box style={{ display: 'flex' }}>
              <Typography sx={{ textAlign: 'left' }} variant={'h6'}>
                {fileUploadContent.fileName}
              </Typography>
              <ClearIcon onClick={(e) => setFileUploadContent(undefined)} />
            </Box>
          )}
          {versionRadioValue === 'v1' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 3 }}>
              <Button component="label" variant="contained">
                Upload Plan Definition
                {/* We need this key to track rerendering of file type input */}
                <VisuallyHiddenInput key={fileUploadContent?.fileName} accept=".json" type="file" onChange={onUpload} />
              </Button>
              {fileUploadContent == null && (
                <Typography sx={{ textAlign: 'left', color: 'gray' }} variant={'caption'}>
                  (optional)
                </Typography>
              )}
              <InputLabel sx={{ textAlign: 'left', mt: 2 }} htmlFor="target-version">
                Release Label
                <Tooltip
                  placement="right-start"
                  title={`The label to be applied for components in the download output (i.e., 'RCTC' Library and grouping value sets)`}
                  sx={{ mt: 1 }}
                >
                  <InfoIcon sx={{ color: 'var(--theme-400)', ml: 'auto', width: '15px', height: '15px' }} />
                </Tooltip>
              </InputLabel>
              <Input
                sx={{ textAlign: 'left' }}
                id="target-version"
                placeholder="e.g. 2023-06-04"
                onChange={(e) => {
                  const regex = new RegExp('\\d{4}-\\d{2}-\\d{2}')
                  if (!regex.test(e?.target?.value)) {
                    setInputError(true)
                  } else {
                    setInputError(false)
                  }
                  setTargetVersion(e?.target?.value)
                }}
                type="text"
                inputProps={{
                  maxLength: 10,
                  pattern: '\\d{4}-\\d{2}-\\d{2}'
                }}
              />
              {inputError ? (
                <Typography sx={{ textAlign: 'left', color: 'red' }} variant={'caption'}>
                  Must be in the format of YYYY-MM-DD
                </Typography>
              ) : (
                <Typography sx={{ textAlign: 'left', color: 'gray' }} variant={'caption'}>
                  (Optional)
                </Typography>
              )}
            </Box>
          )}
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
  )
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1
})

export { ExportPackageDetailsModal }
