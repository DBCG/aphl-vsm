import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import { Button } from '@/components/buttons/Button'

interface GenText {
  modalAction: 'remove' | 'add' | null
  dataType: 'grouper' | 'condition' | null
  totalVs: number
}

const generateText = ({ modalAction, dataType, totalVs }: GenText) => {
  return ({
    title: `${modalAction} selected ${dataType}`,
    text: `${modalAction} ${modalAction === 'remove' ? 'from' : 'to'} all ${totalVs} Value Sets?`,
    actionText: ``,
    modalLoadingText: (
      <LoadingText>
        Editing may take a moment.
        <br />
        Please keep this window open until the action completes.
      </LoadingText>
    )
  })
}

interface ModalInfo {
  actionType: 'remove' | 'add' | null
  dataType: 'condition' | 'grouper' | null
  totalVs: number
  isOpen: boolean
  handleCancelModal: () => void
  handleModalAction: Function
  loading: boolean
  program: fhir4.Library | null
  cancellable?: boolean
  updateVersion?: Dispatch<SetStateAction<string | null | undefined>>
}

const LoadingText = styled.p`
  font-size: 120%;
  line-height: 150%;
`

const EditModal = ({
  isOpen,
  actionType,
  dataType,
  loading,
  handleCancelModal,
  cancellable = true,
  handleModalAction,
  totalVs
}: ModalInfo) => {
  const { title, text, actionText } = generateText({ modalAction: actionType, dataType, totalVs })

  const [disableSubmission, setDisableSubmission] = useState(false)


  // disable submission if no entries?
  useEffect(() => {
    if (!totalVs) {
      setDisableSubmission(true)
    } else {
      setDisableSubmission(false)
    }
  }, [totalVs])

  if (!isOpen || !dataType || !actionType) return null

  return (
    <Dialog open={isOpen}>
      <DialogTitle style={{ textTransform: 'capitalize' }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        <DialogContentText>
          {actionText}
        </DialogContentText>

      </DialogContent>
      <DialogActions>
        <Button
          data-modal={'cancel'}
          text="Cancel"
          onClick={() => handleCancelModal()}
          style={{ backgroundColor: 'var(--neutral-300)' }}
        />
        <Button
          text={`YES, ${actionType}`}
          data-modal={'confirm'}
          disabled={disableSubmission}
          loading={loading || false}
          onClick={async () => { await handleModalAction() }}
        />
      </DialogActions>
    </Dialog>
  )
}

export { EditModal }
