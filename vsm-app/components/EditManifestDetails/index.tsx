import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import Select from 'react-select'
import DT from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import { StyledLabel } from '@/components/InputLabel'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { modalStyle } from '@/styles'
import { SystemSelection, ManifestDataMap, ManifestSystemVersionPair } from '@/types/manifestTypes'
import { getProgramManifestVersions } from '@/helpers/valueSetHelpers'
import { customTableStyles } from '@/components/tables/themes'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'
import { ErrorMessage } from '@/components/ErrorMessage'
import {
  getIdFromSystem,
  getNameByUri,
  namesByUri,
  searchAvailableUpdates,
  searchLeafValueSets,
  updateManifest
} from '@/components/EditManifestDetails/manifestHelpers'
import ManifestDescription from '@/components/EditManifestDetails/ManifestDescription'
import { Box, Modal, Typography } from '@mui/material'

const endWrapPx = 900

const DataTableContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 36px;
  @media (max-width: ${endWrapPx}px) {
    flex-wrap: wrap;
  }
`

const MaxWidthContainer = styled.div`
  flex: 1;
  @media (max-width: ${endWrapPx}px) {
    min-width: 100%;
  }
`

const CodesystemSelectContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 36px;
  margin-bottom: 48px;
  margin-left: 0;
`

// Removes already selected versions from the available list
const filterSelectedVersions = (availableVersions: ManifestDataMap, currentSelectedData: ManifestDataMap, selectedSystem: string) => {
  const availableVersionOptions = availableVersions[selectedSystem]
  if (currentSelectedData[selectedSystem]) {
    const usedVersions = currentSelectedData[selectedSystem]
    return availableVersionOptions?.filter((i: string) => !usedVersions.includes(i))
  }
  return availableVersionOptions
}

const EditManifestDetails = ({ program }: { program: fhir4.Library }) => {
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [availableUpdates, setAvailableUpdates] = useState<ManifestSystemVersionPair[]>([])
  const [availableLeafValueSetCodeSystems, setAvailableLeafValueSetCodeSystems] = useState<ManifestSystemVersionPair[]>([])
  const [availableVersions, setAvailableVersions] = useState<ManifestDataMap>({})
  const [currentSelectedData, setCurrentSelectedData] = useState<ManifestDataMap>({})
  const [systemNamesByUri, setSystemNamesByUri] = useState({})
  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(program?.id ? `/api/programs/${program?.id}/manifest` : null, fetcher, { revalidateOnFocus: false })

  const manifestData = useMemo(() => (program ? getProgramManifestVersions(program) : null), [program])
  // loading states
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    // Initializes the available CodeSystem Options from VSAC
    if (systemAndVersionData.length > 0) {
      setSystemSelections(systemAndVersionData)
      const sysNamesByUri = namesByUri(systemAndVersionData)

      setSystemNamesByUri(sysNamesByUri)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
    setPageLoading(isLoading)
  }, [isLoading, systemAndVersionData, error])

  useEffect(() => {
    // Initializes the current selected data
    if (manifestData && Object.keys(manifestData).length !== 0) {
      setCurrentSelectedData(manifestData)
    }
  }, [program?.id, manifestData])

  useEffect(() => {
    // Pull the available versions for the selected CodeSystem
    const retrieveSelectedSystemVersions = async () => {
      setPageLoading(true)
      const manifestUrlEndpoint = `/api/programs/${program?.id}/manifest?url=${selectedSystem}`
      try {
        const systemVersionData = await fetch(manifestUrlEndpoint).then((res) => {
          if (res.ok) return res.json()
          throw new Error('Error retrieving available versions for Code System, please try again later')
        })
        availableVersions[selectedSystem] = systemVersionData
        setAvailableVersions(structuredClone(availableVersions))
      } catch (e: any) {
        toast.error(e?.message)
      } finally {
        setPageLoading(false)
      }
    }
    if (selectedSystem && !availableVersions[selectedSystem]) {
      retrieveSelectedSystemVersions()
    }
  }, [selectedSystem, availableVersions, program?.id])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  const deleteFn = ({ system, version }: ManifestSystemVersionPair) => {
    setIsUpdating(true)
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i: any) => i !== version) || []
    const deletedId = getIdFromSystem(system)
    updateManifest({
      programId: program?.id as string,
      currentSelectedData: clonedcurrentSelectedData,
      setCurrentSelectedData,
      setIsUpdating,
      action: 'delete',
      id: deletedId,
      version
    })
    setIsUpdating(false)
  }

  if (selectOptions.length === 0) {
    return null // Fixes a nextjs hydration error
  }

  const onClickAddHandler = (newVersion: string, system?: string) => {
    const targetedSystem = system || selectedSystem
    setIsUpdating(true)
    const clonedcurrentSelectedData = structuredClone(currentSelectedData)
    // collect all provisional versions, we want to keep these in the manifest but swap out the pinned version
    const toUpdateManifestVersions = clonedcurrentSelectedData[targetedSystem]?.filter((i: string) => i.includes('provisional')) || []
    toUpdateManifestVersions.push(newVersion)
    clonedcurrentSelectedData[targetedSystem] = toUpdateManifestVersions

    updateManifest({
      programId: program?.id as string,
      currentSelectedData: clonedcurrentSelectedData,
      setCurrentSelectedData,
      setIsUpdating,
      action: 'add',
      id: getIdFromSystem(targetedSystem),
      version: newVersion
    })
  }

  const containsNonProvisionalVersion = currentSelectedData[selectedSystem]?.filter((i) => !i.toLowerCase().includes('provisional')) || []

  const errorMessage = `Version ${currentSelectedData[selectedSystem]} selected for ${selectedSystem}.`

  const shouldDisableAddButton = (currentSelectedData[selectedSystem] != null && containsNonProvisionalVersion?.length > 0) || isUpdating

  return (
    <>
      <Modal open={availableLeafValueSetCodeSystems?.length > 0} onClose={() => setAvailableLeafValueSetCodeSystems([])}>
        <Box sx={{ ...modalStyle, width: 800, flexDirection: 'column', display: 'flex' }}>
          <Typography variant="h6" component="h2" sx={{ marginBottom: '1rem' }}>
            Found CodeSystem From ValueSets
          </Typography>
          <DT
            data={availableLeafValueSetCodeSystems}
            highlightOnHover
            defaultSortAsc={false}
            defaultSortFieldId={3}
            columns={[
              {
                name: 'Name',
                selector: (row: ManifestSystemVersionPair) => getNameByUri(row?.system, systemNamesByUri),
                maxWidth: '150px',
                sortable: true,
                wrap: true
              },
              {
                name: 'System',
                selector: (row: ManifestSystemVersionPair) => row?.system,
                maxWidth: '250px',
                sortable: true,
                wrap: true
              },
              {
                name: 'Versions',
                maxWidth: '500px',
                selector: (row: ManifestSystemVersionPair) => row.version,
                sortable: true,
                // Some code systems have urls for their versions with the date at the end
                // @ts-ignore
                sortFunction: (a: string, b: string) => a.split('/')?.pop()?.localeCompare(b.split('/').pop()),
                wrap: true
              },
              {
                cell: (row) => {
                  const disabled = currentSelectedData[row.system] != null && currentSelectedData[row.system].includes(row.version)
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      disabled={disabled}
                      data-add-manifest={`${row.system}|${row.version}`}
                      text={currentSelectedData[row.system] && !disabled ? 'Update To Latest' : 'Add'}
                      onClick={() => {
                        onClickAddHandler(row.version, row.system)
                      }}
                    />
                  )
                },
                sortable: true,
                wrap: true
              }
            ]}
            theme="aphl"
            fixedHeader
            customStyles={customTableStyles('readonly')}
            className="detail-table"
          />
          <Button
            style={{ marginTop: '1rem', maxWidth: '50px', alignSelf: 'flex-end' }}
            text="Close"
            onClick={() => setAvailableLeafValueSetCodeSystems([])}
          />
        </Box>
      </Modal>
      <ManifestDescription context="manifest-page" />
      <CodesystemSelectContainer style={{ marginTop: '3rem' }}>
        <StyledLabel style={{ fontSize: '1rem' }}>Available Version for CodeSystem: </StyledLabel>
        <Select
          isLoading={pageLoading}
          id="code-system-selector"
          styles={{
            container: (baseStyle) => ({
              ...baseStyle,
              width: '300px',
              marginLeft: '10px',
              marginTop: '-3px',
              zIndex: 2
            })
          }}
          isSearchable={true}
          onChange={({ value }: any) => setSelectedSystem(value)}
          name="codesystems"
          options={selectOptions}
        />
        {Boolean(Object.keys(currentSelectedData).length) && (
          <div style={{ position: 'relative', alignSelf: 'flex-end', marginLeft: '2em' }}>
            <Tooltip
              title={`Search for updates to the latest version CodeSystem`}
              style={{ position: 'absolute', top: '-1em', right: '-0.5em' }}
            >
              <InfoIcon sx={{ color: 'var(--theme-400)', ml: 'auto', width: '20px', height: '20px' }} />
            </Tooltip>
            <Button
              style={{ marginLeft: '10px' }}
              text="Find Newest Versions"
              disabled={isUpdating}
              loading={isUpdating}
              onClick={() => {
                setIsUpdating(true)
                // Set empty to avoid conflicts
                setAvailableLeafValueSetCodeSystems([])
                searchAvailableUpdates({
                  programId: program?.id as string,
                  currentSelectedData,
                  systemAndVersionData,
                  setAvailableUpdates,
                  setIsUpdating
                })
              }}
            />
          </div>
        )}
        <Button
          style={{ marginLeft: '10px' }}
          text="Search ValueSets"
          disabled={isUpdating}
          loading={isUpdating}
          onClick={() => {
            setIsUpdating(true)
            // Set empty to avoid conflicts
            setAvailableUpdates([])
            searchLeafValueSets({
              programId: program?.id as string,
              currentSelectedData,
              setAvailableLeafValueSetCodeSystems,
              setIsUpdating
            })
          }}
        />
      </CodesystemSelectContainer>
      <DataTableContainer>
        <MaxWidthContainer>
          <StyledLabel>Available Versions</StyledLabel>
          <DT
            data={filterSelectedVersions(availableVersions, currentSelectedData, selectedSystem) || []}
            highlightOnHover
            defaultSortAsc={false}
            defaultSortFieldId={3}
            columns={[
              {
                name: 'Name',
                selector: () => getNameByUri(selectedSystem, systemNamesByUri),
                sortable: true,
                wrap: true
              },
              {
                name: 'System',
                selector: () => selectedSystem,
                sortable: true,
                wrap: true
              },
              {
                name: 'Versions',
                maxWidth: '120px',
                selector: (row) => row,
                sortable: true,
                // Some code systems have urls for their versions with the date at the end
                // @ts-ignore
                sortFunction: (a: string, b: string) => a.split('/')?.pop()?.localeCompare(b.split('/').pop()),
                wrap: true
              },
              {
                cell: (newVersion) => {
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      disabled={shouldDisableAddButton}
                      data-add-manifest={`${selectedSystem}|${newVersion}`}
                      text="Add"
                      onClick={() => onClickAddHandler(newVersion)}
                    />
                  )
                },
                maxWidth: '50px',
                sortable: true,
                wrap: true
              }
            ]}
            theme="aphl"
            fixedHeader
            customStyles={customTableStyles('readonly')}
            pagination
            paginationPerPage={10}
            className="detail-table"
          />
        </MaxWidthContainer>
        <MaxWidthContainer>
          <StyledLabel>Current Manifest</StyledLabel>
          {!isUpdating && shouldDisableAddButton && <ErrorMessage error={errorMessage} severity="warning" />}
          <ManifestDetailTable
            programId={program?.id}
            className="detail-table"
            customStyles={customTableStyles('readonly')}
            data={currentSelectedData}
            availableUpdates={availableUpdates}
            loading={manifestData == null}
            updateFn={(version: string, system: string) => {
              const targetedCodeSystemIndex = availableUpdates.findIndex((i) => i.system === system)
              const targetedCodeSystem = availableUpdates[targetedCodeSystemIndex]
              onClickAddHandler(targetedCodeSystem?.version, system)
              // Remove the update from the available updates list
              availableUpdates.splice(targetedCodeSystemIndex, 1)
              const newUpdates = [...availableUpdates]
              setAvailableUpdates(newUpdates)
              setIsUpdating(false)
            }}
            deleteFn={deleteFn}
          />
        </MaxWidthContainer>
      </DataTableContainer>
    </>
  )
}

export default EditManifestDetails
