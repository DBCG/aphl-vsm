import React, { ChangeEvent, useState } from 'react'
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
  Tooltip,
  TextField
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
  setExportError: (error: string) => void
}

const ExportPackageDetailsModal = ({ isOpen, toggleModalOpen, program, setExportError }: ModalInfo) => {
  const [fileType, setFileType] = useState<'json' | 'xml'>('json')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [versionRadioValue, setVersionRadioValue] = useState('v2')
  const [fileUploadContent, setFileUploadContent] = useState<undefined | { fileName: string; content: string }>(undefined)
  const [targetVersion, setTargetVersion] = useState<string>('')
  const [inputError, setInputError] = useState<boolean>(false)
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  const downloadTextData = (data: string, type: `${string}${'json' | 'xml'}`) => {
    // https://stackoverflow.com/a/55613750/8144343
    const blob = new Blob([data], { type: type })
    const href = URL.createObjectURL(blob)
    // create "a" HTLM element with href to file
    const link = document.createElement('a')
    link.href = href
    link.download = `${program?.name || program?.id}-bundle.${type.includes('json') ? 'json' : 'xml'}`
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

  const handleDownload = async () => {
    setDownloadLoading(true)
    const body: ExpectedPackageBody = {
      data: { parameters: { resourceType: 'Parameters' }, json: fileType === 'json', useV2: versionRadioValue === 'v2' }
    }

    if (versionRadioValue === 'v1' && fileUploadContent) {
      body.planDefinition = fileUploadContent.content
      body.targetVersion = targetVersion
    }

    let data
    try {
      data = await fetch(`/api/programs/${program?.id}/package`, {
        method: 'POST',
        body: JSON.stringify(body)
      }).then((resp) => resp.text())
    } catch (error) {
      console.error(error)
      setExportError('Error exporting artifact')
      return
    }

    try {
      // if it's not JSON this will throw an error
      JSON.parse(data)
      // Download JSON
      downloadTextData(data, 'application/fhir+json')
    } catch (error) {
      // all XML starts with <
      if (data?.[0] === '<') {
        // Download XML
        downloadTextData(data, 'application/fhir+xml')
      } else {
        toast.error('Unable to parse $package response')
        setExportError('Unable to parse $package response')
      }
    } finally {
      toggleModalOpen()
      setDownloadLoading(false)
    }
  }

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0] as File
    const content = (await readFile(file)) as string
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
            <Typography sx={{ textAlign: 'left' }} variant={'h6'}>
              {fileUploadContent.fileName}
            </Typography>
          )}
          {versionRadioValue === 'v1' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 3 }}>
              <Button component="label" variant="contained">
                Upload Plan Definition
                <VisuallyHiddenInput accept=".json" type="file" onChange={onUpload} />
              </Button>
              {fileUploadContent == null && (
                <Typography sx={{ textAlign: 'left', color: 'red' }} variant={'caption'}>
                  required *
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
            onClick={handleDownload}
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
