import React, { useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Switch,
  Stack,
  Typography
} from '@mui/material'
import styled from 'styled-components'

interface ModalInfo {
  isOpen: boolean
  toggleModalOpen: () => void
  handleDownloadClick: (useV2: boolean, xml: boolean) => void
}

const PackageDetailsModal = ({ isOpen, toggleModalOpen, handleDownloadClick }: ModalInfo) => {
  const xml = useRef<HTMLInputElement>(null)
  const useV2 = useRef<HTMLInputElement>(null)
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  const handleDownload = () => {
    handleDownloadClick(!!useV2.current?.checked, !!xml.current?.checked)
    toggleModalOpen()
  }
  return (
    <Dialog open={isOpen}>
      <ModalContent style={{ minWidth: '300px' }}>
        <DialogTitle sx={{ textAlign: 'left' }}>Export Options</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel control={<Checkbox defaultChecked={false} inputRef={xml} />} label="XML" />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography>V1</Typography>
              {<Switch defaultChecked={true} inputRef={useV2} />}
              <Typography>V2</Typography>
            </Stack>
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
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
