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
  const [isAdding, setIsAdding] = useState(false)
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
      setIsAdding(false)
      setCurrentSelectedData(mData)
      const notificationTxt = `${action === 'add' ? 'Added ' : 'Deleted '} ${id || ''} ${version ? ` v. ${version}` : ''}`
      toast.success(notificationTxt)
    } catch (err) {
      console.error(err)
      toast.error('Error adding manifest program version')
    }
  }

  useEffect(() => {
    const retrieveSelectedSystemVersions = async () => {
      setPageLoading(true)
      const manifestUrlEndpoint = `/api/programs/${programId}/manifest?url=${selectedSystem}`
      const systemVersionData = await fetch(manifestUrlEndpoint).then((res) => res.json())
      availableVersions[selectedSystem] = systemVersionData
      setAvailableVersions(structuredClone(availableVersions))
      setPageLoading(false)
    }
    if (selectedSystem && !availableVersions[selectedSystem]) {
      retrieveSelectedSystemVersions()
    }
  }, [selectedSystem, programId])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  const deleteFn = ({ system, version }: ManifestSystemVersionPair) => {
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i: any) => i !== version) || []
    const deletedId = getIdFromSystem(system)
    updateManifest({ currentSelectedData: clonedcurrentSelectedData, action: 'delete', id: deletedId, version })
  }

  if (selectOptions.length === 0) {
    return null // Fixes a nextjs hydration error
  }

  const containsNonProvisionalVersion = currentSelectedData[selectedSystem]?.filter((i) => !i.toLowerCase().includes('provisional')) || []

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
                wrap: true
              },
              {
                cell: (newVersion) => {
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      disabled={isAdding}
                      data-add-manifest={`${selectedSystem}|${newVersion}`}
                      text="Add"
                      onClick={() => {
                        setIsAdding(true)
                        const clonedcurrentSelectedData = structuredClone(currentSelectedData)
                        clonedcurrentSelectedData[selectedSystem] = [...(clonedcurrentSelectedData[selectedSystem] || []), newVersion]

                        updateManifest({
                          currentSelectedData: clonedcurrentSelectedData,
                          action: 'add',
                          id: getIdFromSystem(selectedSystem),
                          version: newVersion
                        })
                      }}
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
          <ManifestDetailTable
            programId={programId}
            className="detail-table"
            customStyles={customTableStyles('readonly')}
            data={currentSelectedData}
            loading={manifestData == null}
            deleteFn={deleteFn}
          />
        </MaxWidthContainer>
      </DataTableContainer>
    </>
  )
}

export default EditManifestDetails
