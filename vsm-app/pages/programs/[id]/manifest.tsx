import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import Select from 'react-select'
import DT, { TableStyles } from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { FieldTitle } from '@/components/ProgramDetails/styles'
import { Button } from '@/components/buttons/Button'
import LoadingIndicator from '@/components/LoadingIndicator'
import ManifestDetailTable, { ManifestData } from '@/components/ManifestDetailTable'
import { StyledLabel } from '@/components/InputLabel'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { Row, Id } from '@/styles'

export const customStyles = {
  table: {
    style: {
      minWidth: '600px' // override the row height
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

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`

const DataTableContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 36px;
`

const CodesystemSelectContainer = styled.div`
  margin-bottom: 36px;
`

interface ManifestDataMap {
  [key: string]: string[]
}

// Removes already selected versions from the available list
const filterSelectedVersions = (availableVersions: ManifestDataMap, currentSelectedData: ManifestDataMap, selectedSystem: string) => {
  const availableVersionOptions = availableVersions[selectedSystem]
  if (currentSelectedData[selectedSystem]) {
    const usedVersions = currentSelectedData[selectedSystem]
    return availableVersionOptions?.filter((i: string) => !usedVersions.includes(i))
  }
  return availableVersionOptions
}

const EditManifestDetails = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const programAndGrouperInfo = useGetProgramDetails(programId)
  const [systemSelections, setSystemSelections] = useState([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [availableVersions, setAvailableVersions] = useState({} as ManifestDataMap)
  const [currentSelectedData, setCurrentSelectedData] = useState<ManifestDataMap>({})
  const { data = {}, isLoading, error } = useSWR(`/api/programs/${programId}/manifest`, fetcher, { revalidateOnFocus: false })

  // loading states
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setSystemSelections(data)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
    setPageLoading(isLoading)
  }, [isLoading, data, error])

  useEffect(() => {
    if (Object.keys(programAndGrouperInfo.manifestData).length !== 0) {
      setCurrentSelectedData(programAndGrouperInfo.manifestData)
    }
  }, [programAndGrouperInfo.manifestData])

  const updateManifest = async (upToDateManifestData: any, didDelete?: boolean) => {
    const manifestEndpoint = `/api/programs/${programId}/manifest`
    try {
      const manifestData = await fetch(manifestEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upToDateManifestData)
      }).then((res) => res.json())
      setCurrentSelectedData(manifestData)
      if (didDelete) {
        toast.success('Deleted Manifest Program Version Successfully')
      } else {
        toast.success('Added Manifest Program Version Successfully')
      }
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

  const deleteFn = ({ system, version }: ManifestData) => {
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i: any) => i !== version) || []
    updateManifest(clonedcurrentSelectedData, true)
  }

  return (
    <>
      <Row>
        <Button text="&#8592; Back to program" onClick={() => router.push(`/programs/${programId}`)} />
      </Row>
      <Row>
        <FlexRow>
          <PageTitle>Program Manifest Details</PageTitle>
          <Image width={24} height={24} alt="" src="/images/right-chevron.svg" />
          <Id>
            <FieldTitle>ID</FieldTitle>
            {programId}
          </Id>
        </FlexRow>
      </Row>
      <CodesystemSelectContainer>
        <StyledLabel>CodeSystem</StyledLabel>
        <Select
          isLoading={pageLoading}
          styles={{
            container: (baseStyle) => ({
              ...baseStyle,
              width: '300px',
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
        <div>
          <StyledLabel>Available Versions</StyledLabel>
          <DT
            data={filterSelectedVersions(availableVersions, currentSelectedData, selectedSystem) || []}
            style={{ width: '500px' }}
            highlightOnHover
            columns={[
              {
                name: 'System',
                selector: () => selectedSystem,
                sortable: true,
                wrap: true
              },
              {
                name: 'Versions',
                selector: (row) => row,
                sortable: true,
                wrap: true
              },
              {
                cell: (newVersion) => {
                  return (
                    <Button
                      data-tag="allowRowEvents"
                      text="Add"
                      onClick={() => {
                        const clonedcurrentSelectedData = structuredClone(currentSelectedData)
                        clonedcurrentSelectedData[selectedSystem] = [...(clonedcurrentSelectedData[selectedSystem] || []), newVersion]
                        updateManifest(clonedcurrentSelectedData)
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
            customStyles={customStyles}
            pagination
            paginationPerPage={10}
            progressPending={pageLoading}
            progressComponent={<LoadingIndicator />}
          />
        </div>
        <div>
          <StyledLabel>Current Manifest</StyledLabel>
          <ManifestDetailTable customStyles={customStyles} data={currentSelectedData} deleteFn={deleteFn} />
        </div>
      </DataTableContainer>
    </>
  )
}

export default EditManifestDetails
