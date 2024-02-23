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
}

const packageProgram = async ({
  isJson,
  isV2,
  targetVersion,
  fileUploadContent,
  programId
}: PackageParams) => {
  try {
    const bodyForPackage = formatBody({
      isJson,
      isV2,
      targetVersion,
      fileUploadContent
    })

    return await fetch(`/api/programs/${programId}/package`, {
      method: 'POST',
      body: JSON.stringify(bodyForPackage)
    }).then((res) => {
      return isJson || !res.ok ? res.json() : res.text()
    })
  } catch (e) {
    return({ error: ['Unknown error occured while packaging this program to export.'] })
  }
}

const formatBody = ({
  isJson,
  isV2,
  targetVersion,
  fileUploadContent
}: BodyFormatter): ExpectedPackageBody => {
  const body = {
    data: {
      parameters: {
        resourceType: 'Parameters'
      },
      json: isJson,
      useV2: isV2
    }
  } as ExpectedPackageBody

  if (!isV2 && fileUploadContent) {
    body.planDefinition = fileUploadContent.content
    body.targetVersion = targetVersion
  }
  return body
}

const validatePackage = async (pkgBundle: fhir4.Bundle) => {
  try {
    const body = { pkg: pkgBundle }
    return await fetch(`/api/programs/validate`, {
      method: 'POST',
      body: JSON.stringify(body)
    }).then((res) => res.json())
  } catch (e) {
    return({ error: 'Unknown error occured while validating this program.' })
  }
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
    // setExportError(null)
  }

  useEffect(() => {
    handleResetState()
  }, [])

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
    handleResetState()
  }

  const downloadTextData = (data: string, type: `${string}${'json' | 'xml'}`) => {
    // https://stackoverflow.com/a/55613750/8144343
    const blob = new Blob([data], { type: type })
    const href = URL.createObjectURL(blob)
    // create "a" HTLM element with href to file
    const link = document.createElement('a')
    link.href = href
    const specialCharRx = /[^a-zA-Z\d\s:\-_]/gi
    const spaceAndUnderscoreRx = /[\s_]/gi
    // first, remove special characters that are not - or _
    // next, replace all _ with -
    const cleanedFileName = ((program?.title || program?.id || 'program').replaceAll(specialCharRx, '')).replaceAll(spaceAndUnderscoreRx, '-')
    const fileExtension = type.includes('json') ? 'json' : 'xml'
    link.download = `${cleanedFileName}-bundle.${fileExtension}`
    document.body.appendChild(link)
    link.click()

    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
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
    setDownloadLoading(false)
    toggleModalOpen()
  }

  const handleClickExport = async () => {
    setDownloadLoading(true)

    const errorByTopic = {
      'Package Errors': [] as string[] | string,
      'Server Errors': [] as string[] | string,
      'Download Errors': [] as string[] | string,
      'Validation Errors': [] as string[] | string
    }

    const packageResponse = await packageProgram({
      isJson: fileType === 'json',
      isV2: versionRadioValue === 'v2',
      targetVersion,
      fileUploadContent,
      programId: program.id!
    })

    // early return if package fails will jump
    if (packageResponse.error) {
      errorByTopic['Package Errors'] = packageResponse.error
      setExportError(errorByTopic)
      handleExitExportModal()
      return
    }

    const packageToValidate = fileType === 'json' ? packageResponse : await packageProgram({
      isJson: true,
      isV2: versionRadioValue === 'v2',
      targetVersion,
      fileUploadContent,
      programId: program.id!
    })

    const validationResult = await validatePackage(packageToValidate, program.id!)

    // document validation errors
    if (validationResult?.error?.length) {
      const validationErrorStrings = validationResult.error
      errorByTopic['Validation Errors'] = validationErrorStrings
    }

    try {
      if (typeof packageResponse === 'string' && packageResponse.startsWith('<Bundle')) {
        downloadTextData(packageResponse, 'application/fhir+xml')
      } else if (typeof packageResponse === 'object' && packageResponse.resourceType === 'Bundle') {
        downloadTextData(JSON.stringify(packageResponse), 'application/fhir+json')
      } else {
        errorByTopic['Download Errors'] = `Could not download file in ${ fileType.toUpperCase() } format`
      }

      const errorsExist = Boolean(Object.values(errorByTopic).filter(e => (Boolean(e?.length))))
      if (errorsExist) {
        setExportError(errorByTopic)
      }
    } catch (error) {
      errorByTopic['Download Errors'] = 'File download failed'
      setExportError(errorByTopic)
    }
    handleExitExportModal()
  }

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0] as File
    const content = (await readFile(file)) as fhir4.PlanDefinition
    setFileUploadContent({ fileName: file?.name, content })
  }

  return (
    <Dialog open={isOpen}>
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
                Target Version
                <Tooltip
                  placement="right-start"
                  title={`The version to be applied for components in the download output (i.e., 'RCTC' Library and grouping value sets)`}
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
          <LoadingButton
            loading={downloadLoading}
            disabled={(versionRadioValue === 'v1' && !fileUploadContent) || downloadLoading}
            data-modal={'Download'}
            onClick={handleClickExport}
          >
            Download
          </LoadingButton>
        </DialogActions>
      </ModalContent>
    </Dialog>
  )
}

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

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
