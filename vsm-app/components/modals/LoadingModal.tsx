import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { getReleaseDescription, getReleaseLabel, setReleaseDescription as releaseDescriptionSet } from '@/helpers/libraryHelpers'
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

const LoadingModal = ({ isOpen, actionType, loading, handleCancelModal, cancellable = true, handleModalAction, program }: ModalInfo) => {
  const { title, text, actionText, modalLoadingText } = modalText[actionType]

  const [currentProgram, setProgram] = useState(program)
  const [releaseDescription, setReleaseDescription] = useState('')
  const [releaseLabel, setReleaseLabel] = useState('')
  const [disableSubmission, setDisableSubmission] = useState(false)

  useEffect(() => {
    // Need to set here because async
    if (program != null) {
      setProgram(program)
      setReleaseDescription(getReleaseDescription(program))
      setReleaseLabel(getReleaseLabel(program))
    }
  }, [program])

  useEffect(() => {
    if (actionType === 'release' && (releaseDescription.length === 0 || releaseLabel.length === 0)) {
      setDisableSubmission(true)
    } else {
      setDisableSubmission(false)
    }
  }, [actionType, releaseDescription.length, releaseLabel.length])

  return (
    <Dialog open={isOpen}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        <DialogContentText>
          {actionText}
          {actionType === 'release' && (
            <>
              <TextArea
                label="Description of Release"
                id="releaseDescription"
                required={true}
                value={releaseDescription}
                onChange={(e) => {
                  const newValue = e?.target?.value?.trim()
                  setReleaseDescription(newValue)
                }}
              />
              <TextArea
                label="Label for Release"
                id="releaseLabel"
                style={{ marginTop: '24px' }}
                required={true}
                value={releaseLabel}
                onChange={(e) => {
                  const newValue = e?.target?.value?.trim()
                  setReleaseLabel(newValue)
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
              const modifiedProgram = releaseDescriptionSet(currProgram, releaseDescription.trim())
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

export { LoadingModal }
