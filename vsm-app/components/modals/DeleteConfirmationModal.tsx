import React, { useEffect, useState, Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'
import ReactModal from 'react-modal'
import { Button } from '@/components/buttons/Button'

interface ModalInfo {
  isOpen: boolean
  itemToDelete?: string
  toggleModalOpen: () => void
  handleConfirmDelete: () => void
}

const customModalStyles = {
  overlay: {
    zIndex: 2
  },
  content: {
    maxWidth: '500px',
    margin: '0 auto',
    height: 'fit-content',
    paddingBottom: '48px'
  }
}

if (typeof window !== 'undefined') {
  ReactModal.setAppElement('body')
}

const DeleteConfirmationModal = ({ isOpen, toggleModalOpen, handleConfirmDelete, itemToDelete }: ModalInfo) => {
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    toggleModalOpen()
  }

  return (
    <ReactModal isOpen={isOpen} style={customModalStyles}>
      <ModalContent>
        <ModalTitle>Confirm</ModalTitle>
        <ModalText>Delete{`${itemToDelete ? ' ' + itemToDelete : ''}?`}</ModalText>
        <ButtonGroup>
          <Button
            text="Cancel"
            onClick={(e) => handleCancel(e)}
            style={{ backgroundColor: 'var(--neutral-300)', paddingLeft: '16px', paddingRight: '16px' }}
          />
          <Button
            style={{ paddingLeft: '16px', paddingRight: '16px', backgroundColor: 'var(--accent)' }}
            data-modal={'confirm'}
            text={`YES`}
            onClick={() => {
              handleConfirmDelete()
              toggleModalOpen()
            }}
          />
        </ButtonGroup>
      </ModalContent>
    </ReactModal>
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
