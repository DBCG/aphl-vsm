import { ManifestUrlNameMap, SystemSelection } from '@/types/manifestTypes'
import { useEffect, useMemo, useState } from 'react'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { useGetProgramById } from '@/hooks/useGetProgramById'
import { namesByUri } from '@/components/EditManifestDetails/manifestHelpers'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import ProvisionalVsDescription from '@/components/ProvisionalVS/ProvisionalVsDescription'
import { Step, StepLabel, Stepper } from '@mui/material'
import styled from 'styled-components'

const allFieldsExist = (codeItems: string[]) => {
  const filtered = codeItems.filter(i => i.trim() !== '')
  // check if vals are even valid
  const allFieldsPopulated = filtered.length === 3
  return allFieldsPopulated
}

const ContentWrapper = styled.div`
  margin-left: 2.1rem;
`

const ProvisionalVS = () => {
  const [pageLoading, setPageLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [selectedSystem, setSelectedSystem] = useState('')
  const [systemNamesByUri, setSystemNamesByUri] = useState<ManifestUrlNameMap>({})
  const [provisionalVsets, setProvisionalVsets] = useState([])
  const [codeItemsToAdd, setCodeItemsToAdd] = useState([])
  const [currentCodeItem, setCurrentCodeItem] = useState({})
  const [enableAdd, setEnableAdd] = useState(false)
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false, false])

  const [codeToAdd, setCodeToAdd] = useState('')
  const [displayToAdd, setDisplayToAdd] = useState('')
  const [definitionToAdd, setDefinitionToAdd] = useState('')

  const router = useRouter()
  const programId = router.query.id as string
  const program = useGetProgramById({ programId })
  const {
    data: systemAndVersionData = [],
    isLoading,
    error
  } = useSWR(program?.id ? `/api/programs/${program?.id}/manifest` : null, fetcher, { revalidateOnFocus: false })
  

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Code',
        selector: (row: TableData) => row.code!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Display',
        selector: (row: TableData) => row.display!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Definition',
        selector: (row: TableData) => row.definition!,
        wrap: true
      },
      // {
      //   name: 'Groupers',
      //   selector: (row: TableData) => row.version!,
      //   sortable: true,
      //   wrap: true,
      //   maxWidth: '150px'
      // }
    ]

    return fields
  }, [codeItemsToAdd])

  const clearCurrentCodeItems = () => {
    setCodeToAdd('')
    setDefinitionToAdd('')
    setDisplayToAdd('')
  }

  useEffect(() => {
    setCodeItemsToAdd([])
    clearCurrentCodeItems()
  }, [selectedSystem])

  const selectOptions = useMemo(() => {
    return systemSelections?.map(({ uri, name }) => ({ value: uri, label: `${name}` }))
  }, [systemSelections])

  useEffect(() => {
    const shouldEnable = allFieldsExist([codeToAdd, displayToAdd, definitionToAdd])
    console.log('should: ', shouldEnable)
    setEnableAdd(shouldEnable)
  }, [Object.values(currentCodeItem)])

  useEffect(() => {
    console.log('code items to add: ', codeItemsToAdd)
  }, [codeItemsToAdd])

  useEffect(() => {
    console.log('currentCodeItem: ', currentCodeItem)
  }, [currentCodeItem])

  useEffect(() => {
    // Initializes the available CodeSystem Options from VSAC
    if (systemAndVersionData.length > 0) {
      setSystemSelections(systemAndVersionData)
      const sysNamesByUri = namesByUri(systemAndVersionData)

      // comment out until fix
      setSystemNamesByUri(sysNamesByUri)
    } else if (error) {
      toast.error('Error retrieving Code System data from VSAC')
    }
    setPageLoading(isLoading)
  }, [isLoading, systemAndVersionData, error])

  const handleAddToList = () => {
    setCodeItemsToAdd(prev => [...prev, {code: codeToAdd, display: displayToAdd, definition: definitionToAdd}])
    clearCurrentCodeItems()
  }

  const showValueSetStep = !enableAdd && codeItemsToAdd.length > 0

  const provisionalVs = useGetProvisionalVS()
  console.log('provisionalVs: ', provisionalVs)
  // maybe filter by ones that use this codesystem w/ version PROVISIONAL

  console.log(provisionalVs.length)
  const firstStep = !provisionalVs?.length ? (
    <div>No Provisional Value Sets found, create one below</div>
  ) : (
    <div>Provisional Value Sets found:
      {provisionalVs?.map(p => <>{p.title}</>)}
    </div>
  )

  // const secondStep = 

  const stepContents = [
    {
      label: 'Create or Update a VSM Provisional Value Set',
      content: <ContentWrapper>{firstStep}</ContentWrapper>
    }
  ]

  return (
    <>
    <ProvisionalVsDescription/>
    <div style={{ display: 'flex', alignContent: 'flex-start' }}>
        <Stepper orientation='vertical' activeStep={activeStep}>
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
    {/* Stepper above here */}
      <p>Create or Update a Provisional Value Set for use in VSM</p>
      <p>Here, you may compose a Provisional Value Set.</p>
      <p>Existing VSM Provisional Value Sets</p>
      {provisionalVs?.length === 0 && (
        <>
          {/* <p>[ There are currently no Provisional Value Sets Available ]</p> */}
          <p>Make one by selecting a Code System to extend</p>
        </>
      )}
      <p style={{fontWeight: 'bold'}}>Base Codesystem:</p>
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
      {selectedSystem && (
        <>
        <p>Code List to Add:</p>
        <DataTable
          data={codeItemsToAdd}
          columns={columns}
        />

        <p>Add Codes to System {selectedSystem}</p>
        <SearchInput
          label='Code'
          onChange={(e) => {
            // handle empty string case
            setCodeToAdd(e.target.value)
          }}
          value={codeToAdd}
        />
        <SearchInput
          label='Display'
          onChange={(e) => setDisplayToAdd(e.target.value)}
          value={displayToAdd}
        />
        <SearchInput
          label='Definition (more detail about this code)'
          onChange={(e) => setDefinitionToAdd(e.target.value)}
          value={definitionToAdd}
        />
        {enableAdd && (
          <Button
            text='Add to List'
            onClick={handleAddToList}
          />
        )}
        {showValueSetStep && (
          <Button
            text='Create Provisional Value Set'
            onClick={handleAddToList}
          />
        )}
        </>
      )}
    </>
  )
}

export default ProvisionalVS