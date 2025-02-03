import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, Button, DialogActions } from '@mui/material'
import styled from 'styled-components'

interface ModalInfo {
  isOpen: boolean
  itemToDelete?: string
  toggleModalOpen: () => void
  handleConfirmDelete: () => void
}

const DeleteConfirmationModal = ({ isOpen, toggleModalOpen, handleConfirmDelete, itemToDelete }: ModalInfo) => {
  const [inProgress, setInProgress] = useState(false)
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  const handleConfirm = async () => {
    if (inProgress) {
      return
    }
    setInProgress(true)
    await handleConfirmDelete()
    toggleModalOpen()
  }

  return (
    <Dialog open={isOpen}>
      <ModalContent style={{ minWidth: '300px'}}>
        <DialogTitle>Delete Confirm</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete{`${itemToDelete ? ' ' + itemToDelete : ''}?`}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={inProgress} style={{ color: 'gray !important' }} onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={inProgress} data-modal={'yes'} onClick={handleConfirm}>
            YES
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

export { DeleteConfirmationModal }
