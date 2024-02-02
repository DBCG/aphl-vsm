import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, ListItem, List, Box } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

interface GenText {
  modalAction: 'remove' | 'add' | 'update' | null
  dataType: 'grouper' | 'condition' | 'priority' | null
  totalVs: number
}

const generateText = ({ modalAction, dataType, totalVs }: GenText) => {
  // if fields unset, can't render
  if (!modalAction || !dataType) return null

  const text = {
    'remove': ['Remove selected', 'Remove from'],
    'add': ['Add selected', 'Add to'],
    'update': ['Update selected', 'Update selected']
  }

  return ({
    title: `${text[modalAction][0]} ${dataType}`,
    text: `${text[modalAction][1]} ${totalVs} Value Set${totalVs === 1 ? '' : 's'}?`,
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

type EditAction = 'remove' | 'add' | 'update' | null

interface ModalInfo {
  actionType: EditAction
  dataType: 'condition' | 'grouper' | 'priority' | null
  totalVs: number
  isOpen: boolean
  handleCancelModal: () => void
  handleModalAction: Function
  loading: boolean
  program: fhir4.Library | null
  cancellable?: boolean
  updateVersion?: Dispatch<SetStateAction<string | null | undefined>>
  grouperDeleteErrors: string[]
}

const LoadingText = styled.p`
  font-size: 120%;
  line-height: 150%;
`

interface ErrorProps {
  grouperDeleteErrors: string[]
  actionType: EditAction
}
const ErrorItem = ({ grouperDeleteErrors, actionType }: ErrorProps) => {
  if (!grouperDeleteErrors?.length || actionType !== 'remove') return null

  const errorItems = grouperDeleteErrors.map((i) => (<li key={i.replaceAll(' ', '')}><DialogContentText>{i}</DialogContentText></li>))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'start', columnGap: '.5em', marginTop: '1em'}}>
        <WarningAmberOutlinedIcon/>
        <DialogContentText style={{ marginTop: 0 }}>Skipping grouper delete on the following value sets, as it would render them without groupers:</DialogContentText>
      </div>
      <ul>
        {errorItems}
      </ul>
    </div>
  )
}

const EditModal = ({
  isOpen,
  actionType,
  dataType,
  loading,
  handleCancelModal,
  handleModalAction,
  totalVs,
  grouperDeleteErrors
}: ModalInfo) => {

  const modalText = generateText({ modalAction: actionType, dataType, totalVs })

  const [disableSubmission, setDisableSubmission] = useState(false)
  
  // disable submission if no entries?
  useEffect(() => {
    if (!totalVs) {
      setDisableSubmission(true)
    } else {
      setDisableSubmission(false)
    }
  }, [totalVs])
  
  if (!isOpen || !dataType || !actionType || !modalText) return null
  const { title, text, actionText } = modalText

  return (
    <Dialog open={isOpen}>
      <DialogTitle style={{ textTransform: 'capitalize' }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        <DialogContentText>
          {actionText}
        </DialogContentText>
        <ErrorItem actionType={actionType} grouperDeleteErrors={grouperDeleteErrors}/>
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
