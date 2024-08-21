import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stepper, Step, StepLabel, Typography } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { getReleaseDescription, getReleaseLabel, validStartDate } from '@/helpers/libraryHelpers'
import { TextArea } from '../TextArea'
import DateInput from '../DateInput'
import { SearchInput } from '../SearchInput'
import { isValidSimpleSemver } from '@/helpers/server/semverHelpers'
import ManifestDetailTable from '../ManifestDetailTable'
import { getProgramManifestVersions } from '@/helpers/valueSetHelpers'
import { getIdFromSystem, searchAvailableUpdates, updateManifest } from '@/components/EditManifestDetails/manifestHelpers'
import { ManifestSystemVersionPair, SelectedManifestDataVersion } from '@/types/manifestTypes'
import ManifestDescription from '../EditManifestDetails/ManifestDescription'

export interface ReleasePayload {
  programId: string
  releaseDescription?: string
  releaseLabel?: string
  effectiveStartDate: string | Date
  releaseAsVersion: string
}

interface ModalInfo {
  isOpen: boolean
  handleCancelModal: () => void
  handleModalAction: (releasePayload: ReleasePayload) => Promise<void>
  loading: boolean
  program: fhir4.Library
  cancellable?: boolean
  setProgramToRelease: Dispatch<SetStateAction<fhir4.Library | null>>
}

const LoadingText = styled.p`
  font-size: 120%;
  line-height: 150%;
`

const modalText = {
  title: 'Release Program',
  text: 'Releasing this program will mark it as active and allow others to use it as a template.',
  actionText: 'Please review the following required* fields to continue:',
  modalLoadingText: (
    <LoadingText>
      Releasing may take up to a minute.
      <br />
      Please keep this window open until it completes.
    </LoadingText>
  )
}

const ReleaseModal = ({ isOpen, loading, handleCancelModal, handleModalAction, program }: ModalInfo) => {
  const { title, text, actionText } = modalText
  const [releaseDescription, setReleaseDescription] = useState(getReleaseDescription(program))
  const [releaseLabel, setReleaseLabel] = useState(getReleaseLabel(program))
  const [effectiveStartDate, setEffectiveStartDate] = useState<string | undefined>(program?.effectivePeriod?.start)
  const [versionError, setVersionError] = useState<string | undefined>(program?.version?.split('-draft')?.[0])
  const [versionToCheck, setVersionToCheck] = useState<string | undefined>(program?.version?.split('-draft')?.[0])
  const [activeStep, setActiveStep] = useState(0)
  const [stepsCompleted, setStepsCompleted] = useState([false, false])
  const [currentSelectedData, setCurrentSelectedData] = useState<SelectedManifestDataVersion>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [availableUpdates, setAvailableUpdates] = useState([])
  const { data: matches = [] } = useSWR(
    versionToCheck && isValidSimpleSemver(versionToCheck) ? `/api/programs?version=${versionToCheck}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: systemAndVersionData = [], isLoading } = useSWR(`/api/programs/${program?.id}/manifest`, fetcher, {
    revalidateOnFocus: false
  })

  const hasFormError = () => {
    return Boolean(releaseDescription.length === 0 || releaseLabel.length === 0 || !validStartDate(effectiveStartDate) || versionError)
  }

  const handleNext = () => {
    if (activeStep === 0) {
      if (hasFormError()) {
        setStepsCompleted([false, stepsCompleted[1]])
        return
      }
      setActiveStep((a) => a + 1)
      setStepsCompleted([true, stepsCompleted[1]])
    }
  }

  const cancelModal = () => {
    handleCancelModal() // from parent
    setActiveStep(0)
  }

  const deleteFn = ({ system, version }: ManifestSystemVersionPair) => {
    setIsUpdating(true)
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i: any) => i !== version) || []
    const deletedId = getIdFromSystem(system)
    updateManifest({
      setCurrentSelectedData,
      setIsUpdating,
      currentSelectedData: clonedcurrentSelectedData,
      action: 'delete',
      id: deletedId,
      version,
      programId: program?.id as string
    })
    setIsUpdating(false)
  }

  const onClickAddHandler = (newVersion: string, system: string) => {
    const targetedSystem = system
    setIsUpdating(true)
    const clonedcurrentSelectedData = structuredClone(currentSelectedData)
    // collect all provisional versions, we want to keep these in the manifest but swap out the pinned version
    const toUpdateManifestVersions = clonedcurrentSelectedData[targetedSystem]?.filter((i: string) => i.includes('provisional')) || []
    toUpdateManifestVersions.push(newVersion)
    clonedcurrentSelectedData[targetedSystem] = toUpdateManifestVersions

    updateManifest({
      setCurrentSelectedData,
      currentSelectedData: clonedcurrentSelectedData,
      action: 'add',
      id: getIdFromSystem(targetedSystem),
      version: newVersion,
      setIsUpdating,
      programId: program?.id as string
    })
  }

  const handleBack = () => {
    if (activeStep === 0 && hasFormError()) return
    setStepsCompleted([false, false])
    setActiveStep(0)
  }

  useEffect(() => {
    const checkForVersionErrors = () => {
      const versionFormatErrorExists = versionToCheck ? !isValidSimpleSemver(versionToCheck) : false
      const shouldShowVersionError =
        versionFormatErrorExists || (typeof versionToCheck === 'string' && versionToCheck.trim() === '') || !versionToCheck
      if (shouldShowVersionError) {
        setVersionError('Please ensure proper semantic version format. Numbers and periods only. Example: 3.14.1 or 10.4.0 are valid')
      } else if (matches.length) {
        setVersionError(`Version ${versionToCheck} is already used for a Program. Please pick a unique version.`)
      } else {
        setVersionError(undefined)
      }
    }

    checkForVersionErrors()
  }, [versionToCheck, matches])

  useEffect(() => {
    // Initializes the current selected data
    const manifestData = getProgramManifestVersions(program)
    setCurrentSelectedData(manifestData)
    searchAvailableUpdates({
      programId: program?.id as string,
      currentSelectedData: manifestData,
      systemAndVersionData,
      setAvailableUpdates,
      setIsUpdating,
      disableNotifications: true
    })
  }, [])

  if (!isOpen || !program) return null

  const defaultVersion = program?.version?.split('-')?.[0]

  const stepContents = [
    {
      label: 'Review Program Details',
      content: (
        <div>
          <DialogContentText>{text}</DialogContentText>
          <DialogContentText>{actionText}</DialogContentText>
          <>
            <SearchInput
              style={{ marginTop: '2rem', marginBottom: '1rem' }}
              label="Update Program Version *"
              onChange={(e) => {
                setVersionError(undefined)
                setVersionToCheck(e?.target?.value)
              }}
              defaultValue={defaultVersion}
              helperMessage={'This version must be in 3 or 4-digit semantic versioning format. Example: 3.0.2 or 10.1.2.3'}
              errorMessage={versionError}
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
              label={'Effective Start Date *'}
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
        </div>
      )
    },
    {
      label: 'Review Manifest Details',
      content: (
        <div>
          <Typography>Manifest versions may be added to specify specific code system versions in this program.</Typography>
          <ManifestDescription context="release-modal" />
          <ManifestDetailTable
            programId={program?.id!}
            manifestData={currentSelectedData}
            availableUpdates={availableUpdates}
            updateFn={(version: string, system: string) => {
              const targetedVsIndex = availableUpdates.findIndex((i: ManifestSystemVersionPair) => i.system === system)
              const targetedVs = availableUpdates[targetedVsIndex] as ManifestSystemVersionPair
              onClickAddHandler(targetedVs?.version, system)
              // Remove the update from the available updates list
              availableUpdates.splice(targetedVsIndex, 1)
              const newUpdates = [...availableUpdates]
              setAvailableUpdates(newUpdates)
              setIsUpdating(false)
            }}
            deleteFn={deleteFn}
          />
        </div>
      )
    }
  ]

  return (
    <Dialog open={isOpen} maxWidth={'md'} fullWidth>
      <DialogTitle>{title} - {program.id}</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', alignContent: 'flex-start' }}>
          <Stepper orientation="vertical" activeStep={activeStep}>
            {stepContents.map((step, index) => {
              return (
                <Step key={index} completed={stepsCompleted[index]}>
                  <StepLabel>{step.label}</StepLabel>
                  {activeStep === index && step.content}
                </Step>
              )
            })}
          </Stepper>
        </div>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginTop: '2rem' }}>
          <div>
            <Button
              data-modal={'cancel'}
              text="Cancel"
              onClick={() => cancelModal()}
              style={{ backgroundColor: 'var(--neutral-300)', marginRight: '1rem' }}
            />
            {activeStep === 0 ? (
              <Button text="Next" style={{ width: 'fit-content' }} disabled={hasFormError()} onClick={handleNext} data-modal="next" />
            ) : (
              <>
                <Button text="Back" style={{ width: 'fit-content', backgroundColor: 'var(--theme-400)' }} onClick={() => handleBack()} />
              </>
            )}
          </div>
          {activeStep === 1 && (
            <DialogActions>
              <Button
                text={`RELEASE`}
                data-modal={'confirm'}
                disabled={hasFormError() || isLoading || loading}
                loading={loading || false}
                onClick={() => {
                  if (versionError) {
                    return
                  }
                  handleModalAction({
                    programId: program.id || '',
                    releaseDescription: releaseDescription.trim(),
                    releaseLabel: releaseLabel.trim(),
                    effectiveStartDate: effectiveStartDate || '',
                    releaseAsVersion: versionToCheck || ''
                  })
                }}
              />
            </DialogActions>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ReleaseModal }
