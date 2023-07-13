import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { getReleaseDescription, setReleaseDescription } from '@/helpers/libraryHelpers'
import { TextArea } from '../TextArea'

interface ModalInfo {
  actionType: 'release' | 'publish' | 'clone' | 'grouper-add'
  isOpen: boolean
  handleCancelModal: () => void
  handleModalAction: Function
  loading: boolean
  program: fhir4.Library | null
  cancellable?: boolean
}

const LoadingText = styled.p`
  font-size: 120%;
  line-height: 150%;
`

const modalText = {
  publish: {
    title: 'Publish Program',
    text: 'Publishing ',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Publishing may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  },
  release: {
    title: 'Release Program',
    text: 'Releasing this program will mark it as active and allow others to use it as a template.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Releasing may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  },
  clone: {
    title: 'Clone Program',
    text: 'Cloning this program will create a draft copy that you can edit.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Cloning may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  },
  'grouper-add': {
    title: 'Save your Grouper',
    text: 'Saving your updated grouper ValueSet',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Saving a grouper may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  }
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

const LoadingModal = ({ isOpen, actionType, loading, handleCancelModal, cancellable = true, handleModalAction, program }: ModalInfo) => {
  const { title, text, actionText, modalLoadingText } = modalText[actionType]

  const [currentProgram, setProgram] = useState(program)
  const [currentInput, setCurrentInput] = useState('')
  const [disableSubmission, setDisableSubmission] = useState(false)

  useEffect(() => {
    // Need to set here because async
    if (program != null) {
      setProgram(program)
      setCurrentInput(getReleaseDescription(program))
    }
  }, [program])

  useEffect(() => {
    if (actionType === 'release' && currentInput.length === 0) {
      setDisableSubmission(true)
    } else {
      setDisableSubmission(false)
    }
  }, [actionType, currentInput.length])

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogTitle>
          {title}
        </DialogTitle>
        <DialogContentText>
          {text}
        </DialogContentText>
        <DialogContentText>
          {actionText}
          {actionType === 'release' && (
            <>
              <TextArea
                label="Description of Release"
                id="releaseDescription"
                required={true}
                value={currentInput}
                onChange={(e) => {
                  const newValue = e?.target?.value
                  setCurrentInput(newValue)
                }}
              />
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
      <Button data-modal={'cancel'} text="Cancel" onClick={() => handleCancelModal()} style={{ backgroundColor: 'var(--neutral-300)' }} />
        <Button
          text={`YES, ${actionType}`}
          data-modal={'confirm'}
          disabled={disableSubmission}
          loading={loading || false}
          onClick={() => {
            let currProgram = currentProgram
            if (actionType === 'release' && currProgram) {
              const modifiedProgram = setReleaseDescription(currProgram, currentInput.trim())
              setProgram(modifiedProgram)
              currProgram = modifiedProgram
            }
            handleModalAction(actionType, currProgram)
          }}
        />
      </DialogActions>
    </Dialog>
  )
}

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--theme-color);
  backdrop-filter: blur(20px);
`

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

const ModalTitle = styled.h1`
  margin-bottom: 36px;
`

const ModalText = styled.p`
  max-width: 400px;
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
`

export { LoadingModal }
