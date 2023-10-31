import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import Select from 'react-select'
import DT, { TableStyles } from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'
import ManifestDetailTable from '@/components/ManifestDetailTable'
import { StyledLabel } from '@/components/InputLabel'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { Row } from '@/styles'
import { SystemSelection, ResultMap, ManifestDataMap, UpdateManifest, ManifestSystemVersionPair } from '@/types/manifestTypes'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { getProgramManifestVersions } from '@/helpers/valueSetHelpers'
import { customTableStyles } from '@/components/tables/themes'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'
import { ErrorMessage } from '@/components/ErrorMessage'

const endWrapPx = 900

export const customStyles = {
  table: {
    style: {
      minHeight: '100px'
    }
  },
  headCells: {
    style: {
      padding: '12px',
      fontWeight: 'bold',
      overflow: 'visible'
    }
  },
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px',
      whiteSpace: 'normal !important',
      overflow: 'visible'
    }
  }
} as unknown as TableStyles

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

const getIdFromSystem = (system: string): string => {
  return system?.split?.('/')?.slice?.(-1)?.[0] || ''
}

export const namesByUri = (systemVersionData: SystemSelection[]) => {
  const result = {} as ResultMap
  if (systemVersionData.length) {
    systemVersionData.forEach((item) => {
      result[item.uri] = item.name
    })
  }
  return result
}

export const getNameByUri = (uri: string, namesByUri: ResultMap): string => {
  const match = namesByUri[uri]
  return match || ''
}

const EditManifestDetails = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const program = useGetProgramById({ programId })
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [availableUpdates, setAvailableUpdates] = useState([])
  const [availableVersions, setAvailableVersions] = useState<ManifestDataMap>({})
  const [currentSelectedData, setCurrentSelectedData] = useState<ManifestDataMap>({})
  const [systemNamesByUri, setSystemNamesByUri] = useState({})
  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(`/api/programs/${programId}/manifest`, fetcher, { revalidateOnFocus: false })

  const manifestData = useMemo(() => (program ? getProgramManifestVersions(program) : null), [program])
  // loading states
  const [pageLoading, setPageLoading] = useState(true)

  if (program?.status === 'active') {
    router.push(`/programs/${programId}`)
  }

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
  }, [programId, manifestData])

  const updateManifest = async ({ currentSelectedData, action, id, version }: UpdateManifest) => {
    const manifestEndpoint = `/api/programs/${programId}/manifest`
    try {
      const mData = await fetch(manifestEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSelectedData)
      }).then((res) => res.json())
      setCurrentSelectedData(mData)
      const notificationTxt = `${action === 'add' ? 'Added ' : 'Deleted '} ${id || ''} ${version ? ` v. ${version}` : ''}`
      toast.success(notificationTxt)
    } catch (err) {
      console.error(err)
      toast.error('Error adding manifest program version')
    } finally {
      setIsUpdating(false)
    }
  }

  const searchAvailableUpdates = async () => {
    const manifestEndpoint = `/api/programs/${programId}/manifest`

    // Find all the latest versions for the chosen systems
    const availableLatestVersionsMap = {} as { [key: string]: string }
    Object.keys(currentSelectedData).forEach((system) => {
      availableLatestVersionsMap[system] = systemAndVersionData.find((i: SystemSelection) => i.uri === system)?.latestVersion
    })
    try {
      const mData = await fetch(manifestEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availableLatestVersionsMap)
      }).then((res) => res.json())
      // Because VSAC versions in the metadata do not match the version listed on ValueSet we need to double check
      // that the versions we are offering to update are not already the latest
      const filteredAvailableVersions = mData.filter((i: fhir4.ValueSet) => {
        const currentVersions = currentSelectedData[i?.url!]
        return !currentVersions?.includes(i?.version!)
      })
      setAvailableUpdates(filteredAvailableVersions)
    } catch (err) {
      console.error(err)
      toast.error('Error finding available updates')
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    // Pull the available versions for the selected CodeSystem
    const retrieveSelectedSystemVersions = async () => {
      setPageLoading(true)
      const manifestUrlEndpoint = `/api/programs/${programId}/manifest?url=${selectedSystem}`
      try {
        const systemVersionData = await fetch(manifestUrlEndpoint).then((res) => {
          if (res.ok) return res.json()
          throw new Error('Error retrieving available versions for Code System, please try again later')
        })
        availableVersions[selectedSystem] = systemVersionData
        setAvailableVersions(structuredClone(availableVersions))
      } catch(e: any) {
        toast.error(e?.message)
      } finally {
        setPageLoading(false)
      }
    }
    if (selectedSystem && !availableVersions[selectedSystem]) {
      retrieveSelectedSystemVersions()
    }
  }, [selectedSystem, programId])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  const deleteFn = ({ system, version }: ManifestSystemVersionPair) => {
    setIsUpdating(true)
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i: any) => i !== version) || []
    const deletedId = getIdFromSystem(system)
    updateManifest({ currentSelectedData: clonedcurrentSelectedData, action: 'delete', id: deletedId, version })
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
      currentSelectedData: clonedcurrentSelectedData,
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
      <Row>
        <Button id="back-to-program" text="&#8592; Back to program" onClick={() => router.push(`/programs/${programId}`)} />
      </Row>
      <CodesystemSelectContainer>
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
        { Boolean(Object.keys(currentSelectedData).length) && (
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
              loading={isUpdating}
              onClick={() => {
                setIsUpdating(true)
                searchAvailableUpdates()
              }}
            />
          </div>
        )}
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
          {!isUpdating && shouldDisableAddButton && (
            <ErrorMessage
              error={errorMessage}
              severity='warning'
            />
          )}
          <ManifestDetailTable
            programId={programId}
            className="detail-table"
            customStyles={customTableStyles('readonly')}
            data={currentSelectedData}
            availableUpdates={availableUpdates}
            loading={manifestData == null}
            updateFn={(version: string, system: string) => {
              const targetedVsIndex = availableUpdates.findIndex((i: fhir4.ValueSet) => i.url === system)
              const targetedVs = availableUpdates[targetedVsIndex] as fhir4.ValueSet
              onClickAddHandler(targetedVs?.version as string, system)
              // Remove the update from the available updates list
              availableUpdates.splice(targetedVsIndex, 1)
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
