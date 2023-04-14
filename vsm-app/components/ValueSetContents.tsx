import { useState } from 'react'
import { Tabs, Box, Tab, Tooltip, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from './LoadingIndicator'
import { Form } from './ProgramMetadata/styles'
import { SearchInput } from '@/components/SearchInput'
import { InputRow } from '@/styles'
import { Result } from '@/hooks/useGetProgramDetails'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

interface GrouperVSTableData {
  valueSet: string[]
}

interface ExpansionTableData {
  system: string
  version: string
  code: string
  timestamp?: string
}

interface ValueSetContentsProps {
  programAndGrouperInfo: Result
  valueSet: fhir4.ValueSet
}

const EXPANSION_COLUMNS = [
  {
    name: 'System',
    selector: (row: ExpansionTableData) => row?.system!,
    sortable: true,
    wrap: true
  },
  {
    name: 'Version',
    selector: (row: ExpansionTableData) => row?.version!,
    sortable: true,
    wrap: true
  },
  {
    name: 'Code',
    selector: (row: ExpansionTableData) => row?.code!,
    sortable: true,
    wrap: true
  }
]

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`
  }
}

export default function ValueSetContents({ programAndGrouperInfo, valueSet }: ValueSetContentsProps) {
  const [isLoadingExpansion, setIsLoadingExpansion] = useState(false)
  const [value, setValue] = useState(0)
  const isDraftProgram = programAndGrouperInfo?.program?.status === 'draft'
  const [currentValueSet, setCurrentValueSet] = useState(valueSet)

  if (valueSet == null || programAndGrouperInfo?.grouperLibrary == null) {
    return <LoadingIndicator />
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const expandValueSet = async () => {
    setIsLoadingExpansion(true)
    try {
      const updatedValueSet = await fetch(`/api/valueset/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueSetId: currentValueSet.id,
          expansionParameters: programAndGrouperInfo.manifestData
        })
      }).then((res) => res.json())
      if (updatedValueSet?.error == null && updatedValueSet?.expansion) {
        // update just the expansion
        toast.success('Valueset expanded successfully')
        setCurrentValueSet({ ...currentValueSet, expansion: updatedValueSet.expansion })
      } else {
        toast.error('Failed to expand valueset')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to expand valueset')
    }
    setIsLoadingExpansion(false)
  }

  const [programUrl, programVersion] = programAndGrouperInfo?.grouperLibrary?.url?.split('|') || []
  const memberSet = currentValueSet?.compose?.include
  const isGrouperValueSet = memberSet?.[0]?.valueSet?.[0] != null
  const expansion = currentValueSet?.expansion
  const timeStamp = expansion?.timestamp

  let definitionColumns, definitionData
  let expansionColumns, expansionData
  if (isGrouperValueSet) {
    definitionData = memberSet
    expansionData = expansion?.contains
    definitionColumns = [
      {
        name: 'ValueSets',
        selector: (row: GrouperVSTableData) => row?.valueSet?.[0]!,
        sortable: true,
        wrap: true
      }
    ]

    expansionColumns = EXPANSION_COLUMNS
  } else {
    definitionData = memberSet?.[0]?.concept
    expansionData = expansion?.contains

    definitionColumns = [
      {
        name: 'Code',
        selector: (row: any) => row?.code!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Display',
        selector: (row: any) => row?.display!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Version',
        selector: (row: any) => memberSet?.[0]?.version,
        sortable: true,
        wrap: true
      },
      {
        name: 'System',
        selector: (row: any) => memberSet?.[0]?.system,
        sortable: true,
        wrap: true
      }
    ]
    expansionColumns = EXPANSION_COLUMNS
  }

  if (timeStamp && !expansionColumns.find((i) => i.name === 'Timestamp')) {
    expansionColumns?.push({
      name: 'Timestamp',
      selector: (row: ExpansionTableData) => timeStamp!,
      sortable: true,
      wrap: true
    })
  }

  return (
    <Box>
      <Box sx={{ width: '100%', background: 'white' }}>
        <Form>
          <PageTitle>{currentValueSet.title}</PageTitle>
          <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
            <SearchInput id="prog-name" label="ID" readonly={true} def={currentValueSet.id} placeholder={'No valueset id set'} />
            {isDraftProgram && (
              <Typography
                style={{
                  background: '#FAA024',
                  color: 'white',
                  position: 'absolute',
                  padding: '10px',
                  borderRadius: '20px',
                  right: '50px',
                  top: '50px'
                }}
              >
                Program in Draft state
              </Typography>
            )}
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-url"
              label="URL"
              minWidth={650}
              readonly={true}
              def={currentValueSet.url}
              placeholder={'No valueset canonical set'}
            />
            <SearchInput
              id="vs-version"
              label="Version"
              readonly={true}
              def={currentValueSet.version}
              placeholder={'No valueset version set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-description"
              label="Description"
              minWidth={650}
              readonly={true}
              def={currentValueSet.description}
              placeholder={'No valueset description set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-publisher"
              label="Publisher"
              minWidth={650}
              readonly={true}
              def={currentValueSet.publisher}
              placeholder={'No valueset publisher set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-purpose"
              label="Purpose"
              minWidth={650}
              readonly={true}
              def={currentValueSet.purpose}
              placeholder={'No valueset purpose set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="prog-url"
              label="Grouper URL"
              minWidth={650}
              readonly={true}
              def={programUrl}
              placeholder={'No program canonical set'}
            />
            <SearchInput
              id="prog-version"
              label="Grouper Version"
              readonly={true}
              def={programVersion}
              placeholder={'No program version set'}
            />
          </InputRow>
        </Form>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange}>
            <Tab label="Definition" {...a11yProps(0)} />
            <Tab label="Expansion" {...a11yProps(1)} />
            {value === 1 && isDraftProgram && (
              <Box sx={{ ml: 'auto', mr: 3, display: 'flex' }}>
                <Box sx={{ mt: 1, mr: 1 }}>
                  <Tooltip title="Subject to change, program is in draft state" placement="top" arrow>
                    <WarningAmberIcon sx={{ color: '#FFA204' }} />
                  </Tooltip>
                </Box>
                <LoadingButton loading={isLoadingExpansion} onClick={() => expandValueSet()}>
                  Expand
                </LoadingButton>
              </Box>
            )}
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <DataTable columns={definitionColumns} data={definitionData as GrouperVSTableData[]} pagination paginationPerPage={10} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <DataTable columns={expansionColumns} data={expansionData as ExpansionTableData[]} pagination paginationPerPage={10} />
        </TabPanel>
      </Box>
    </Box>
  )
}
