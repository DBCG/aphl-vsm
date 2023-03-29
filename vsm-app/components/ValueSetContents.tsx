import { useState } from 'react'
import { Tabs, Box, Tab, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { PageTitle } from '@/components/Typography'

import LoadingIndicator from './LoadingIndicator'
import DataTable from 'react-data-table-component'
import { Form } from './ProgramMetadata/styles'
import { SearchInput } from '@/components/SearchInput'
import { InputRow } from '@/styles'

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
  grouperLibrary: fhir4.Library
  valueSet: fhir4.ValueSet
  programId: string
  isDraftProgram?: boolean
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
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
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
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  }
}

export default function ValueSetContents({ grouperLibrary, valueSet, isDraftProgram = false, programId }: ValueSetContentsProps) {
  const [value, setValue] = useState(0)
  const router = useRouter()

  if (valueSet == null || grouperLibrary == null) {
    return <LoadingIndicator />
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const [programUrl, programVersion] = grouperLibrary?.url?.split('|') || []
  const memberSet = valueSet?.compose?.include
  const isGrouperValueSet = memberSet?.[0]?.valueSet?.[0] != null

  let definitionColumns, definitionData
  let expansionColumns, expansionData
  const expansion = valueSet?.expansion
  const timeStamp = expansion?.timestamp
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
          <PageTitle>{valueSet.id}</PageTitle>
          <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
            <SearchInput id="prog-name" label="Title" readonly={true} def={valueSet.title} placeholder={'No valueset title set'} />
            {isDraftProgram && (
              <Typography
                style={{
                  background: 'orange',
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
              def={valueSet.url}
              placeholder={'No valueset canonical set'}
            />
            <SearchInput id="vs-title" label="Version" readonly={true} def={valueSet.version} placeholder={'No valueset version set'} />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-description"
              label="Description"
              minWidth={650}
              readonly={true}
              def={valueSet.description}
              placeholder={'No valueset description set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-publisher"
              label="Publisher"
              minWidth={650}
              readonly={true}
              def={valueSet.publisher}
              placeholder={'No valueset publisher set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="vs-purpose"
              label="Purpose"
              minWidth={650}
              readonly={true}
              def={valueSet.purpose}
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
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <DataTable columns={definitionColumns} data={definitionData} pagination paginationPerPage={10} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <DataTable columns={expansionColumns} data={expansionData} pagination paginationPerPage={10} />
        </TabPanel>
      </Box>
    </Box>
  )
}
