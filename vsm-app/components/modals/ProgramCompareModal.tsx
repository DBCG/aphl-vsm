import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Typography
} from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import styled from 'styled-components'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { toast } from 'react-toastify'

interface ModalInfo {
  isOpen: boolean
  programId: string
  closeModal: () => void
}

const ProgramCompareModal = ({ isOpen, closeModal, programId }: ModalInfo) => {
  const [downloadLoading, setDownloadLoading] = useState(false)
  // const [availableVersions, setAvailableVersions] = useState<string[]>([])

  const [targetVersion, setTargetVersion] = useState<string>('')
  const { data: availableVersions, error } = useSWR(`/api/programs/${programId}/compare`, fetcher)

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    closeModal()
    setDownloadLoading(false)
  }

  const handleClickExport = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    setDownloadLoading(true)
    const [version, id] = targetVersion.split('|')
    try {
      const res = await fetch(`/api/programs/${programId}/compare?targetId=${id}`, {
        method: 'POST'
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compare-${programId}-${targetVersion}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        setDownloadLoading(false)
        closeModal()
      } else {
        setDownloadLoading(false)
      }
    } catch (error) {
      toast.error('Failed to download comparison file')
      setDownloadLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleCancel}>
      <ModalContent style={{ minWidth: '300px' }}>
        <DialogTitle sx={{ textAlign: 'left' }}>Generate Comparison Change Log</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" color="text.secondary">
            Select the target version to compare with the current version.
          </Typography>
          <FormControl sx={{ mt: 2 }}>
            <InputLabel>Target Version</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={targetVersion}
              label="Target Version"
              onChange={(e) => {
                setTargetVersion(e.target.value)
              }}
            >
              {availableVersions?.map(({ version, id }: { version: string, id: string }) => (
                <MenuItem key={version} value={`${version}|${id}`}>
                  {version}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

export { ProgramCompareModal }
