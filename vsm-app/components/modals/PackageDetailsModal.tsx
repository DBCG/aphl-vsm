import React, { useRef } from 'react'
import {
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
import styled from 'styled-components'

interface ModalInfo {
  isOpen: boolean
  toggleModalOpen: () => void
  handleDownloadClick: (useV2: boolean, json: boolean) => void
}

const PackageDetailsModal = ({ isOpen, toggleModalOpen, handleDownloadClick }: ModalInfo) => {
  const json = useRef<HTMLInputElement>(null)
  const useV1 = useRef<HTMLInputElement>(null)
  const useV2 = useRef<HTMLInputElement>(null)
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  const handleDownload = () => {
    handleDownloadClick(!!useV2.current?.checked, !!json.current?.checked)
    toggleModalOpen()
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
                  inputRef={json}
                  sx={{
                    '& .MuiSwitch-thumb, & .MuiSwitch-track': { backgroundColor: 'var(--theme-300)' }
                  }}
                />
              }
              <Typography>JSON</Typography>
            </Stack>
            <RadioGroup row defaultValue="v2" name="radio-buttons-group">
              <FormControlLabel inputRef={useV1} value="v1" control={<Radio />} label="V1" />
              <FormControlLabel inputRef={useV2} value="v2" control={<Radio />} label="V2" />
            </RadioGroup>
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button style={{ color: 'gray !important' }} onClick={handleCancel}>
            Cancel
          </Button>
          <Button data-modal={'Download'} onClick={handleDownload}>
            Download
          </Button>
        </DialogActions>
      </ModalContent>
    </Dialog>
  )
}

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

const ModalTitle = styled.h1`
  margin-bottom: 36px;
`

const ModalText = styled.p`
  line-height: 140%;
  margin: 0 auto;
  margin-bottom: 12px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 36px;
`

export { PackageDetailsModal }
