import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { getSession, GetSessionParams } from 'next-auth/react'
import Select from 'react-select';
import DT from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { FieldTitle, StyledSpan } from '.'
import { Button } from '@/components/buttons/Button'
import LoadingIndicator from '@/components/LoadingIndicator'
import ManifestDetailTable, { ManifestData } from '@/components/ManifestDetailTable'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'

export const customStyles = {
  table: {
    style: {
        minWidth: '600px', // override the row height
    },
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
} as TableStyles

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`

export const SelectInputContainer = styled.div`
  width: 100%;
`

export const SelectInputTitle = styled.p`
  padding-bottom: 8px;
  margin: 0;
  margin-right: 12px;
`

const Id = styled(PageTitle).attrs({
  as: 'span'
})`
  font-size: 20px;
`

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`

const DataTableContainer = styled.div`
  display: flex;
  justify-content: space-between; 
`

interface ManifestDataMap {
  [key: string]: string[];
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
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string)
  
  const [systemSelections, setSystemSelections] = useState([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [availableVersions, setAvailableVersions] = useState({} as ManifestDataMap)
  const [currentSelectedData, setCurrentSelectedData] = useState<ManifestDataMap>({})

  // loading states
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (Object.keys(programAndGrouperInfo.manifestData).length !== 0) {
      setCurrentSelectedData(programAndGrouperInfo.manifestData)
    }
  }, [programAndGrouperInfo.manifestData])
  
  useEffect(() => {
    const retrieveSystemVersionOptions = async () => {
      const manifestEndpoint = `/api/programs/${programId}/manifest`
      const manifestData = await fetch(manifestEndpoint).then((res) => res.json())
      setSystemSelections(manifestData)
      setPageLoading(false)
    }
    retrieveSystemVersionOptions()
  }, [programId])

  const updateManifest = async (upToDateManifestData: any) => {
    const manifestEndpoint = `/api/programs/${programId}/manifest`
    const manifestData = await fetch(manifestEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upToDateManifestData)
    }).then((res) => res.json())
    setCurrentSelectedData(manifestData)
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
    return systemSelections.map(({uri, name}) => ({value: uri, label: `${name}`}))
  }, [systemSelections])

  const deleteFn  = ({system, version}: ManifestData) => {
    const clonedcurrentSelectedData = structuredClone(currentSelectedData) // Need to use ref because unable to reference state
    clonedcurrentSelectedData[system] = clonedcurrentSelectedData[system]?.filter((i) => i !== version) || []
    updateManifest(clonedcurrentSelectedData)
  }

  return (
    <>
    <Row>
      <Button 
        text="&#8592; Back to program"
        onClick={() => router.push(`/programs/${programId}`)}
      />
    </Row>
      <Row>
        <FlexRow>
          <PageTitle>Program Manifest Details</PageTitle>
          <Image width={24} height={24} alt='' src='/images/right-chevron.svg' />
          <Id>
            <FieldTitle>ID</FieldTitle>{programId}
          </Id>
        </FlexRow>
      </Row>
      <Row>
      <Select
        isLoading={pageLoading}
        styles={{
          container: (baseStyle) => ({
            ...baseStyle, width: '300px'
          })
        }}
        isSearchable={true}
        onChange={({ value }: any) => setSelectedSystem(value)}
        name="codesystems"
        options={selectOptions}
      />
      </Row>
        <DataTableContainer>
          <div>
            <StyledSpan>Available Versions</StyledSpan>
            <DT
              data={filterSelectedVersions(availableVersions, currentSelectedData, selectedSystem) || []}
              style={{width: '900px'}}
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
                    );
                  },
                  sortable: true,
                  wrap: true
                }
            ]}
              theme='aphl'
              fixedHeader
              customStyles={customStyles}
              progressPending={pageLoading}
              progressComponent={<LoadingIndicator/>}
            />
          </div>
          <div>
            <StyledSpan>Current Manifest</StyledSpan>
            <ManifestDetailTable 
              customStyles={customStyles}
              data={currentSelectedData}
              deleteFn={deleteFn}
            />
          </div>
        </DataTableContainer>
    </>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default EditManifestDetails
