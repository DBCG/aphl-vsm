import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import {
  getReleaseDescription,
  getReleaseLabel,
  setReleaseLabel as releaseLabelSet,
  setReleaseDescription as releaseDescriptionSet,
  setEffectivePeriodStart,
  validStartDate
} from '@/helpers/libraryHelpers'
import { TextArea } from '../TextArea'
import DateInput from '../DateInput'
import { SearchInput } from '../SearchInput'
import { isValidSimpleSemver } from '@/helpers/server/semverHelpers'

interface ModalInfo {
  actionType: 'release' | 'publish' | 'clone'
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

  useEffect(() => {
    // Need to set here because async
    if (program != null) {
      setProgram(program)
      setReleaseDescription(getReleaseDescription(program))
      setReleaseLabel(getReleaseLabel(program))
      setEffectiveStartDate(program?.effectivePeriod?.start || null)
    }
  }, [program])

  useEffect(() => {

  }, [])

  useEffect(() => {
    if (
      actionType === 'release'
      && (
        releaseDescription.length === 0 ||
        releaseLabel.length === 0 ||
        !validStartDate(effectiveStartDate) ||
        versionError
      )) {
      setDisableSubmission(true)
    } else {
      setDisableSubmission(false)
    }
  }, [actionType, releaseDescription.length, releaseLabel.length, effectiveStartDate])


  return (
    <Dialog open={isOpen}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
        <DialogContentText>
          {actionText}
          {actionType === 'release' && (
            <>
              <SearchInput
                style={{ marginTop: '2rem', marginBottom: '1rem' }}
                label="Update Program Version (optional)"
                onChange={
                  (e) => {
                    updateVersion!(e?.target?.value)
                    const versionErrorExists = !isValidSimpleSemver(e?.target?.value)
                    if(versionErrorExists) {
                      setVersionError('This version must be in semantic versioning format with only numbers and periods. Example: 3.0.2')
                    } else {
                      setVersionError(null)
                    }
                  }
                }
                defaultValue={currentProgram?.version?.split('-draft')?.[0]}
                helperMessage={'This version must be in semantic versioning format. Example: 3.0.2'}
                errorMessage={versionError && 'Please ensure proper major.minor.patch version format. Numbers and periods only. Example: 3.14.1'}
              />
              <TextArea
                label="Description of Release"
                id="releaseDescription"
                required={true}
                value={releaseDescription}
                onChange={(e) => {
                  setReleaseDescription(e?.target?.value)
                }}
              />
              <TextArea
                label="Label for Release"
                id="releaseLabel"
                style={{ marginTop: '24px', marginBottom: '3rem' }}
                required={true}
                value={releaseLabel}
                onChange={(e) => {
                  setReleaseLabel(e?.target?.value)
                }}
              />
              <DateInput
                label={'Effective Start Date'}
                id="effectiveStartDate"
                defaultValue={effectiveStartDate || undefined}
                placeholder="No effective start date set"
                readonly={false}
                onChange={(newDate) => {
                  const dateToSave = newDate?.isValid() ? newDate.format('YYYY-MM-DD') : null
                  setEffectiveStartDate(dateToSave)
                }}
                disablePast={true}
                errorText={'Start date must be today or a future date'}
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
          onClick={(e) => {
            let currProgram = currentProgram
            if (actionType === 'release' && currProgram) {
              if (versionError) {
                return
              }
              let modifiedProgram = releaseDescriptionSet(currProgram, releaseDescription.trim())
              modifiedProgram = releaseLabelSet(modifiedProgram, releaseLabel.trim())
              // if effectiveStartDate is set, add it
              if (typeof effectiveStartDate === 'string') {
                modifiedProgram = setEffectivePeriodStart(modifiedProgram, effectiveStartDate)
              }
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
