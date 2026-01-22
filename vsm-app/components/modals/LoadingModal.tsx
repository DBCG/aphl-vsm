import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import {
  getReleaseDescription,
  getReleaseLabel} from '@/helpers/libraryHelpers'
import { isValidThreeOrFourPartSemver } from '@/helpers/server/semverHelpers'
import { useGetPrograms } from '@/hooks/useGetPrograms'

interface ModalInfo {
  actionType: 'publish' | 'clone' | 'withdraw' | 'retire'| 'delete' | 'release'
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
    actionText: 'Please review the following fields to continue:',
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
  withdraw: {
    title: 'Withdraw Program',
    text: 'Withdrawing this draft program will delete it from VSM permanently.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Withdrawing may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  },
  retire: {
    title: 'Retire Program',
    text: 'Retire this active program will retire it from VSM.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Retiring may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  },
  delete: {
    title: 'Delete Program',
    text: 'Deleting this retired program will delete it from VSM permanently.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <LoadingText>
        Deleting may take up to a minute.
        <br />
        Please keep this window open until it completes.
      </LoadingText>
    )
  }
}

const LoadingModal = ({
  isOpen,
  actionType,
  loading,
  handleCancelModal,
  cancellable = true,
  handleModalAction,
  program,
  updateVersion
}: ModalInfo) => {
  const { title, text, actionText, modalLoadingText } = modalText[actionType]

  const [currentProgram, setProgram] = useState(program)
  const [releaseDescription, setReleaseDescription] = useState('')
  const [releaseLabel, setReleaseLabel] = useState('')
  const [effectiveStartDate, setEffectiveStartDate] = useState<string | null>(null)
  const [disableSubmission, setDisableSubmission] = useState(false)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [versionToCheck, setVersionToCheck] = useState<string | undefined>(program?.version?.split('-draft')?.[0])

  const matches = useGetPrograms({ version: versionToCheck })

  useEffect(() => {
    const versionFormatErrorExists = versionToCheck ? !isValidThreeOrFourPartSemver(versionToCheck) : false
    if (versionFormatErrorExists || typeof versionToCheck === 'string' && versionToCheck.trim() === '' || !versionToCheck) {
      setVersionError('Please ensure proper semantic version format. Numbers and periods only. Example: 3.14.1 or 10.4.0 are valid')
    } else if (matches.length) {
      setVersionError(`Version ${versionToCheck} is already used for a Program. Please pick a unique version.`)
    } else {
      setVersionError(null)
    }
  }, [versionToCheck, matches])

  useEffect(() => {
    // Need to set here because async
    if (program != null) {
      setProgram(program)
      setVersionToCheck(program?.version?.split('-draft')?.[0])
      setReleaseDescription(getReleaseDescription(program))
      setReleaseLabel(getReleaseLabel(program))
      setEffectiveStartDate(program?.effectivePeriod?.start || null)
    }
  }, [program])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        <DialogContentText>
          {actionText}
        </DialogContentText>

      </DialogContent>
      <DialogActions>
        <Button data-modal={'cancel'} text="Cancel" onClick={() => handleCancelModal()} style={{ backgroundColor: 'var(--neutral-300)' }} />
        <Button
          text={`YES, ${actionType}`}
          data-modal={'confirm'}
          disabled={disableSubmission || loading}
          loading={loading || false}
          onClick={() => {
            let currProgram = currentProgram
            handleModalAction(actionType, currProgram)
          }}
        />
      </DialogActions>
    </Dialog>
  )
}

export { LoadingModal }
