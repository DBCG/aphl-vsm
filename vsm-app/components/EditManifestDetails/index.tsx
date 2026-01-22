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
import { SystemSelection, ManifestDataMap, ManifestSystemVersionPair, ManifestUrlNameMap, ManifestData, SelectedManifestDataVersion } from '@/types/manifestTypes'
import { getProgramManifestVersions, getVSPManifestVersions } from '@/helpers/valueSetHelpers'
import { customTableStyles } from '@/components/tables/themes'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'
import { ErrorMessage } from '@/components/ErrorMessage'
import LoadingIndicator from '../LoadingIndicator'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Tab } from '@mui/material'
import { is } from '@/helpers/is'
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
const filterSelectedVersions = (availableVersions: ManifestDataMap, currentSelectedData: SelectedManifestDataVersion, selectedSystem: string) => {
  const availableVersionOptions = availableVersions[selectedSystem]
  if (currentSelectedData[selectedSystem]) {
    const usedVersions = currentSelectedData[selectedSystem]
    return availableVersionOptions?.filter((i: ManifestData) => !usedVersions.includes(i.version))
  }
  return availableVersionOptions
}

const EditManifestDetails = ({ program }: { program: fhir4.Library }) => {
  // Detect if this is a VSP
  const isVSP = is.isVSP(program)

  // Tab state (only for VSPs)
  const [manifestTab, setManifestTab] = useState('codesystems')
  const resourceType = manifestTab === 'codesystems' ? 'CodeSystem' : 'ValueSet'

  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [availableUpdates, setAvailableUpdates] = useState<ManifestSystemVersionPair[]>([])
  const [availableLeafValueSetCodeSystems, setAvailableLeafValueSetCodeSystems] = useState<ManifestSystemVersionPair[]>([])
  const [availableVersions, setAvailableVersions] = useState<ManifestDataMap>({})

  // For VSPs, split manifest into CodeSystems and ValueSets
  // For Programs, use single manifest
  const initialManifest = isVSP ? getVSPManifestVersions(program) : { codeSystems: getProgramManifestVersions(program), valueSets: {} }
  const [currentSelectedData, setCurrentSelectedData] = useState<SelectedManifestDataVersion>(
    isVSP ? initialManifest.codeSystems : getProgramManifestVersions(program) || {}
  )
  const [currentSelectedValueSets, setCurrentSelectedValueSets] = useState<SelectedManifestDataVersion>(
    isVSP ? initialManifest.valueSets : {}
  )

  const [systemNamesByUri, setSystemNamesByUri] = useState<ManifestUrlNameMap>({})
  const [pageLoading, setPageLoading] = useState(true)

  // Determine API endpoint based on whether it's a VSP or Program
  const programId = program?.id
  let apiEndpoint: string | null = null
  if (programId) {
    apiEndpoint = isVSP
      ? `/api/value-set-packages/${programId}/manifest?resourceType=${resourceType}`
      : `/api/programs/${programId}/manifest`
  }

  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(apiEndpoint, fetcher)

  // loading states

  const retrieveAvailableUpdates = async () => {
    await searchAvailableUpdates({
      programId: program?.id as string,
      currentSelectedData,
      systemAndVersionData,
      setAvailableUpdates,
      setIsUpdating
    })
  }


  useEffect(() => {
    // Initializes the available CodeSystem Options from VSAC
    if (systemAndVersionData.length > 0) {
      setSystemSelections(systemAndVersionData)
      const sysNamesByUri = namesByUri(systemAndVersionData)

      // comment out until fix
      // retrieveAvailableUpdates()
      setSystemNamesByUri(sysNamesByUri)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
    setPageLoading(isLoading)
  }, [isLoading, systemAndVersionData, error])

  useEffect(() => {
    // Pull the available versions for the selected CodeSystem or ValueSet
    const retrieveSelectedSystemVersions = async () => {
      setPageLoading(true)
      const programId = program?.id
      const baseEndpoint = isVSP
        ? `/api/value-set-packages/${programId}/manifest`
        : `/api/programs/${programId}/manifest`
      const manifestUrlEndpoint = isVSP
        ? `${baseEndpoint}?url=${selectedSystem}&resourceType=${resourceType}`
        : `${baseEndpoint}?url=${selectedSystem}`
      try {
        const systemVersionData = await fetch(manifestUrlEndpoint).then((res) => {
          if (res.ok) return res.json()
          const resourceLabel = isVSP && resourceType === 'ValueSet' ? 'ValueSet' : 'CodeSystem'
          throw new Error(`Error retrieving available versions for ${resourceLabel}, please try again later`)
        })
        availableVersions[selectedSystem] = systemVersionData
        setAvailableVersions(structuredClone(availableVersions))
      } catch (e: any) {
        toast.error(e?.message)
      } finally {
        setPageLoading(false)
      }
    }
    if (program?.id && selectedSystem && !availableVersions[selectedSystem]) {
      retrieveSelectedSystemVersions()
    }
  }, [selectedSystem, availableVersions, program?.id, isVSP, resourceType])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  const deleteFn = ({ system, version }: ManifestSystemVersionPair) => {
    setIsUpdating(true)
    // Clone the correct state based on which tab we're on
    const sourceData = isVSP && manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    const clonedData = structuredClone(sourceData)
    clonedData[system] = clonedData[system]?.filter((i: any) => i !== version) || []
    const deletedId = getIdFromSystem(system)

    // For VSPs, we need to send ExtendedManifestData with both codeSystems and valueSets
    const dataToSend = isVSP
      ? {
          codeSystems: manifestTab === 'codesystems' ? clonedData : currentSelectedData,
          valueSets: manifestTab === 'valuesets' ? clonedData : currentSelectedValueSets
        }
      : clonedData

    updateManifest({
      programId: program?.id as string,
      currentSelectedData: dataToSend,
      setCurrentSelectedData: manifestTab === 'codesystems' ? setCurrentSelectedData : setCurrentSelectedValueSets,
      setIsUpdating,
      action: 'delete',
      id: deletedId,
      version,
      isVSP,
      activeTab: manifestTab
    })
    setIsUpdating(false)
  }

  if (selectOptions.length === 0) {
    return null // Fixes a nextjs hydration error
  }

  const onClickAddHandler = (newVersion: string, system?: string) => {
    const targetedSystem = system || selectedSystem
    setIsUpdating(true)
    // Clone the correct state based on which tab we're on
    const sourceData = isVSP && manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    const clonedData = structuredClone(sourceData)
    // collect all provisional versions, we want to keep these in the manifest but swap out the pinned version
    const toUpdateManifestVersions = clonedData[targetedSystem]?.filter((i: string) => i.includes('provisional')) || []
    toUpdateManifestVersions.push(newVersion)
    clonedData[targetedSystem] = toUpdateManifestVersions

    // For VSPs, we need to send ExtendedManifestData with both codeSystems and valueSets
    const dataToSend = isVSP
      ? {
          codeSystems: manifestTab === 'codesystems' ? clonedData : currentSelectedData,
          valueSets: manifestTab === 'valuesets' ? clonedData : currentSelectedValueSets
        }
      : clonedData

    updateManifest({
      programId: program?.id as string,
      currentSelectedData: dataToSend,
      setCurrentSelectedData: manifestTab === 'codesystems' ? setCurrentSelectedData : setCurrentSelectedValueSets,
      setIsUpdating,
      action: 'add',
      id: getIdFromSystem(targetedSystem),
      version: newVersion,
      isVSP,
      activeTab: manifestTab
    })
  }

  // Get the current manifest data based on active tab (for VSPs)
  const activeManifestData = isVSP && manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData

  const containsNonProvisionalVersion = activeManifestData[selectedSystem]?.filter((i) => !i.toLowerCase().includes('provisional')) || []

  const errorMessage = `Version ${activeManifestData[selectedSystem]} selected for ${selectedSystem}.`

  const shouldDisableAddButton = (activeManifestData[selectedSystem] != null && containsNonProvisionalVersion?.length > 0) || isUpdating

  const manifestContent = (
    <>
      <Modal open={availableLeafValueSetCodeSystems?.length > 0} onClose={() => setAvailableLeafValueSetCodeSystems([])}>
        <Box sx={{ ...modalStyle, width: 800, flexDirection: 'column', display: 'flex' }}>
          <Typography variant="h6" component="h2" sx={{ marginBottom: '1rem' }}>
            ValueSets in this program contain the following version(s) of CodeSystem . If you would like all of your expansions to conform to an existing version, you may select one here
          </Typography>
          <DT
            data={availableLeafValueSetCodeSystems}
            keyField={'version'}
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
                maxWidth: '200px',
                style: { fontSize: '12px' },
                sortable: true,
                wrap: true
              },
              {
                name: 'Versions',
                minWidth: '350px',
                style: { fontSize: '12px' },
                selector: (row: ManifestSystemVersionPair) => row.version,
                sortable: true,
                // Some code systems have urls for their versions with the date at the end
                sortFunction: (a: fhir4.Coding, b: fhir4.Coding) => {
                  const versionA = a?.version?.split('/')?.pop() || ''
                  const versionB = b?.version?.split('/')?.pop() || ''
                  return versionA.localeCompare(versionB)
                },
                wrap: true
              },
              {
                cell: (row) => {
                  const disabled = activeManifestData[row.system] != null && activeManifestData[row.system].includes(row.version)
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      disabled={disabled}
                      data-add-manifest={`${row.system}|${row.version}`}
                      text={activeManifestData[row.system] && !disabled ? 'Update To Latest' : 'Add'}
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
        <StyledLabel style={{ fontSize: '1rem' }}>
          Available Version for {isVSP && manifestTab === 'valuesets' ? 'ValueSet' : 'CodeSystem'}:
        </StyledLabel>
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
          text="Scan ValueSets"
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
            data={filterSelectedVersions(availableVersions, activeManifestData, selectedSystem) || []}
            progressComponent={<LoadingIndicator />}
            progressPending={pageLoading}
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
                selector: (row: ManifestData) => row.version,
                sortable: true,
                sortFunction: (a, b) => Date.parse(a?.date) - Date.parse(b?.date),
                wrap: true
              },
              {
                cell: (newVersion) => {
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      disabled={shouldDisableAddButton}
                      data-add-manifest={`${selectedSystem}|${newVersion.version}`}
                      text="Add"
                      onClick={() => onClickAddHandler(newVersion.version)}
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
            programId={program?.id!}
            manifestData={activeManifestData}
            availableUpdates={availableUpdates}
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

  // For VSPs, wrap content in tabs
  if (isVSP) {
    return (
      <TabContext value={manifestTab}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <TabList onChange={(e, v) => setManifestTab(v)} aria-label="manifest tabs">
            <Tab label="CodeSystem Versions" value="codesystems" />
            <Tab label="ValueSet Versions" value="valuesets" />
          </TabList>
        </Box>
        <TabPanel value="codesystems" sx={{ p: 0 }}>
          {manifestContent}
        </TabPanel>
        <TabPanel value="valuesets" sx={{ p: 0 }}>
          {manifestContent}
        </TabPanel>
      </TabContext>
    )
  }

  // For Programs, return content as-is
  return manifestContent
}

export default EditManifestDetails
