import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import Select from 'react-select'
import DT from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import { StyledLabel } from '@/components/InputLabel'
import useSWR from 'swr'
import { fetcher, apiFetch } from '@/utils'
import { modalStyle } from '@/styles'
import { SystemSelection, ManifestDataMap, ManifestSystemVersionPair, ManifestUrlNameMap, ManifestData, SelectedManifestDataVersion } from '@/types/manifestTypes'
import {
  getProgramManifestVersions,
  getVSPManifestVersions,
  filterToUnversioned,
  applyVersionUpdate,
  applyAddManifestEntry
} from '@/helpers/valueSetHelpers'
import { customTableStyles } from '@/components/tables/themes'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'
import { ErrorMessage } from '@/components/ErrorMessage'
import LoadingIndicator from '../LoadingIndicator'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Tab, FormControlLabel, Switch, TextField, Stack, Autocomplete, CircularProgress } from '@mui/material'
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

  // VSP-only: manual entry + unversioned filter
  const [addCanonical, setAddCanonical] = useState('')
  const [addVersion, setAddVersion] = useState('')
  const [showOnlyUnversioned, setShowOnlyUnversioned] = useState(false)
  const [fetchedVersions, setFetchedVersions] = useState<string[]>([])
  const [fetchingVersions, setFetchingVersions] = useState(false)
  const [versionsSource, setVersionsSource] = useState<string | null>(null)

  // Reset fetched versions when canonical or tab changes — they were tied to the prior canonical.
  useEffect(() => {
    setFetchedVersions([])
    setVersionsSource(null)
  }, [addCanonical, manifestTab])

  const handleFetchVersions = async () => {
    const canonical = addCanonical.trim()
    if (!canonical) return
    setFetchingVersions(true)
    try {
      const response = await apiFetch(`/api/codesystem-versions?canonical=${encodeURIComponent(canonical)}`)
      const result = await response.json()
      if (!response.ok) {
        toast.error(result?.error || 'Failed to fetch versions')
        setFetchedVersions([])
        setVersionsSource(null)
        return
      }
      const versions: string[] = Array.isArray(result?.versions) ? result.versions : []
      setFetchedVersions(versions)
      setVersionsSource(result?.source?.endpointAddress || null)
      if (versions.length === 0) {
        toast.info(`No versions returned for ${canonical}`)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to fetch versions')
      setFetchedVersions([])
      setVersionsSource(null)
    } finally {
      setFetchingVersions(false)
    }
  }

  // Determine API endpoint based on whether it's a VSP or Program.
  // VSPs don't need this catalog at all — the dropdown is gone and
  // ManifestDetailTable does its own fetch for name lookups.
  const programId = program?.id
  let apiEndpoint: string | null = null
  if (programId && !isVSP) {
    apiEndpoint = `/api/programs/${programId}/manifest`
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
        const systemVersionData = await apiFetch(manifestUrlEndpoint).then((res) => {
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
    const programIdForFetch = program?.id
    if (!isVSP && programIdForFetch && selectedSystem && !availableVersions[selectedSystem]) {
      retrieveSelectedSystemVersions()
    }
  }, [selectedSystem, availableVersions, program?.id, isVSP, resourceType])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  // VSP-only: filter the displayed manifest to only unversioned entries when the toggle is on.
  // Defined above the early returns below so the hook order stays stable across renders.
  const displayManifestData = useMemo(() => {
    const active = isVSP && manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    if (!isVSP || !showOnlyUnversioned) return active
    return filterToUnversioned(active)
  }, [isVSP, manifestTab, currentSelectedValueSets, currentSelectedData, showOnlyUnversioned])

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

  if (!isVSP && isLoading) {
    return <LoadingIndicator />
  }

  if (!isVSP && selectOptions.length === 0) {
    return (
      <ErrorMessage
        error="No CodeSystem or ValueSet data available from the terminology server. Please check your VSAC credentials in Settings."
        severity="warning"
      />
    )
  }

  const onClickAddHandler = (newVersion: string, system?: string) => {
    const targetedSystem = system || selectedSystem
    setIsUpdating(true)
    // Clone the correct state based on which tab we're on
    const sourceData = isVSP && manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    const clonedData = structuredClone(sourceData)
    // Keep only provisional versions — strip any resolved pinned version AND unresolved (empty) entries
    const toUpdateManifestVersions = clonedData[targetedSystem]?.filter((i: string) => i && i.includes('provisional')) || []
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

  // VSP-only: replace an existing version pin in-place (used by inline edit on table rows)
  const handleUpdateVersion = (system: string, oldVersion: string, newVersion: string) => {
    setIsUpdating(true)
    const sourceData = manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    const updated = applyVersionUpdate(sourceData, system, oldVersion, newVersion)

    const dataToSend = {
      codeSystems: manifestTab === 'codesystems' ? updated : currentSelectedData,
      valueSets: manifestTab === 'valuesets' ? updated : currentSelectedValueSets
    }

    updateManifest({
      programId: program?.id as string,
      currentSelectedData: dataToSend,
      setCurrentSelectedData: manifestTab === 'codesystems' ? setCurrentSelectedData : setCurrentSelectedValueSets,
      setIsUpdating,
      action: 'add',
      id: getIdFromSystem(system),
      version: newVersion,
      isVSP: true,
      activeTab: manifestTab
    })
  }

  // VSP-only: add a new manifest entry from the free-text canonical + version inputs
  const handleAddVSP = () => {
    const canonical = addCanonical.trim()
    if (!canonical) {
      toast.error('Canonical URL is required')
      return
    }
    const version = addVersion.trim()

    setIsUpdating(true)
    const sourceData = manifestTab === 'valuesets' ? currentSelectedValueSets : currentSelectedData
    const updated = applyAddManifestEntry(sourceData, canonical, version)

    const dataToSend = {
      codeSystems: manifestTab === 'codesystems' ? updated : currentSelectedData,
      valueSets: manifestTab === 'valuesets' ? updated : currentSelectedValueSets
    }

    updateManifest({
      programId: program?.id as string,
      currentSelectedData: dataToSend,
      setCurrentSelectedData: manifestTab === 'codesystems' ? setCurrentSelectedData : setCurrentSelectedValueSets,
      setIsUpdating,
      action: 'add',
      id: getIdFromSystem(canonical),
      version,
      isVSP: true,
      activeTab: manifestTab
    })

    setAddCanonical('')
    setAddVersion('')
  }


  // Filter out empty (unresolved) and provisional versions — only resolved, non-provisional versions should block adding
  const containsNonProvisionalVersion = activeManifestData[selectedSystem]?.filter((i) => i && !i.toLowerCase().includes('provisional')) || []
  const hasUnresolvedVersion = activeManifestData[selectedSystem]?.some((i) => !i) || false

  const errorMessage = hasUnresolvedVersion
    ? `An unresolved version exists for ${getNameByUri(selectedSystem, systemNamesByUri) || selectedSystem}. Select a version below to resolve it.`
    : `Version ${containsNonProvisionalVersion[0] || activeManifestData[selectedSystem]} selected for ${getNameByUri(selectedSystem, systemNamesByUri) || selectedSystem}.`

  const shouldDisableAddButton = (activeManifestData[selectedSystem] != null && containsNonProvisionalVersion?.length > 0) || isUpdating

  const vspManifestContent = (
    <>
      <ManifestDescription context="manifest-page" />
      <Box sx={{ mt: 3, mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add {manifestTab === 'valuesets' ? 'ValueSet' : 'CodeSystem'} version
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            label="Canonical URL"
            placeholder={manifestTab === 'valuesets' ? 'http://hl7.org/fhir/ValueSet/...' : 'http://loinc.org'}
            value={addCanonical}
            onChange={(e) => setAddCanonical(e.target.value)}
            sx={{ flex: 2 }}
            inputProps={{ 'data-add-canonical': true }}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={fetchedVersions}
            value={addVersion}
            onInputChange={(_e, value) => setAddVersion(value)}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Version (optional)"
                placeholder="e.g. 2.74"
                inputProps={{ ...params.inputProps, 'data-add-version': true }}
              />
            )}
          />
          {manifestTab === 'codesystems' && (
            <Button
              text={fetchingVersions ? 'Fetching…' : 'Fetch versions'}
              disabled={fetchingVersions || !addCanonical.trim()}
              loading={fetchingVersions}
              onClick={handleFetchVersions}
            />
          )}
          <Button
            text="Add"
            disabled={isUpdating || !addCanonical.trim()}
            loading={isUpdating}
            onClick={handleAddVSP}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Leave the version empty to add an unversioned entry — the terminology server will choose the version during expansion.
        </Typography>
        {versionsSource && fetchedVersions.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Showing {fetchedVersions.length} version{fetchedVersions.length === 1 ? '' : 's'} from {versionsSource}.
          </Typography>
        )}
      </Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showOnlyUnversioned}
              onChange={(e) => setShowOnlyUnversioned(e.target.checked)}
              inputProps={{ 'aria-label': 'Show only unversioned entries' }}
            />
          }
          label="Show only unversioned"
        />
      </Stack>
      <ManifestDetailTable
        programId={program?.id!}
        manifestData={displayManifestData}
        deleteFn={deleteFn}
        resourceType="vsp"
        unversionedSeverity="info"
        onUpdateVersion={handleUpdateVersion}
      />
    </>
  )

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
          {!isUpdating && !shouldDisableAddButton && hasUnresolvedVersion && <ErrorMessage error={errorMessage} severity="info" />}
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
          {vspManifestContent}
        </TabPanel>
        <TabPanel value="valuesets" sx={{ p: 0 }}>
          {vspManifestContent}
        </TabPanel>
      </TabContext>
    )
  }

  // For Programs, return content as-is
  return manifestContent
}

export default EditManifestDetails
