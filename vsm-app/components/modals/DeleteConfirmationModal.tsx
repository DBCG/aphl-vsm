import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, Button, DialogActions } from '@mui/material'
import styled from 'styled-components'

interface ModalInfo {
  isOpen: boolean
  itemToDelete?: string
  toggleModalOpen: () => void
  handleConfirmDelete: () => void
}

const DeleteConfirmationModal = ({ isOpen, toggleModalOpen, handleConfirmDelete, itemToDelete }: ModalInfo) => {
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  const handleConfirm = () => {
    handleConfirmDelete()
    toggleModalOpen()
  }

  return (
    <Dialog open={isOpen}>
      <ModalContent style={{ minWidth: '300px'}}>
        <DialogTitle>Confirm</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete{`${itemToDelete ? ' ' + itemToDelete : ''}?`}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button style={{ color: 'gray !important' }} onClick={handleCancel}>
            Cancel
          </Button>
          <Button data-modal={'yes'} onClick={handleConfirm}>
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

export { DeleteConfirmationModal }
