import { useState, SetStateAction, Dispatch } from 'react'
import { Tabs, Box, Tab, Tooltip, Typography, TextField, IconButton } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { ProgramDetails } from '@/types/grouperTypes'
import ClearIcon from '@mui/icons-material/Clear'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

interface ExpansionTableData {
  system: string
  version: string
  code: string
  timestamp?: string
}

interface GrouperVSTableData {
  valueSet: string[]
}

interface ValueSetDetailsTablesProps {
  setCurrentValueSet: Dispatch<SetStateAction<any>>
  programAndGrouperInfo: ProgramDetails
  currentValueSet: fhir4.ValueSet
  isGrouperValueSet: boolean
  isDraftProgram: boolean
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
    id: 'code',
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
      {value === index && <Box sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`
  }
}

const ValueSetDetailsTables = ({
  setCurrentValueSet,
  programAndGrouperInfo,
  currentValueSet,
  isGrouperValueSet,
  isDraftProgram
}: ValueSetDetailsTablesProps) => {
  const [value, setValue] = useState(0) // Used for tabs
  const [isLoadingExpansion, setIsLoadingExpansion] = useState(false)
  const [filterDefinitionText, setFilterDefinitionText] = useState('')
  const [filterExpansionText, setFilterExpansionText] = useState('')

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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
      toast.error('Failed to expand valueset')
    }
    setIsLoadingExpansion(false)
  }

  const memberSet = currentValueSet?.compose?.include
  const expansion = currentValueSet?.expansion
  const timeStamp = expansion?.timestamp

  let definitionColumns, definitionData
  let expansionColumns, expansionData
  // Conditionally set the columns and data based on whether the valueset is a grouper or not
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
        name: 'Display',
        selector: (row: any) => row?.display!,
        sortable: true,
        wrap: true
      },
      {
        name: 'System',
        selector: (row: any) => memberSet?.[0]?.system,
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
        name: 'Code',
        selector: (row: any) => row?.code!,
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

  const filteredDefinitions = (defData: any) => {
    const textToFind = filterDefinitionText.trim()
    if (!textToFind) return defData
  
    if (isGrouperValueSet) {
      return defData.filter(
        (item: any) => item?.valueSet?.[0]?.toLowerCase().includes(filterDefinitionText.toLowerCase())
      )
    } else {
      return defData.filter(
        (item: any) => item?.display?.toLowerCase().includes(filterDefinitionText.toLowerCase())
      )
    }
  }

  const filteredDefinitionData = filteredDefinitions(definitionData)

  const filteredExpansionData = expansionData?.filter((item) => item?.code?.toLowerCase().includes(filterExpansionText.toLowerCase())) || []

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleTabChange}>
          <Tab label="Definition" {...a11yProps(0)} />
          { !isGrouperValueSet && <Tab label="Expansion" {...a11yProps(1)} /> }
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
        <TextField
          sx={{ backgroundColor: 'white', mb: 2, width: '240px', alignSelf: 'end' }}
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => setFilterDefinitionText('')}>
                <ClearIcon sx={{ color: 'black', width: '20px', height: '20px' }} />
              </IconButton>
            )
          }}
          value={filterDefinitionText}
          onChange={(e) => setFilterDefinitionText(e.target.value)}
          id="filter-definition-table"
          label="Filter Definitions"
          variant="outlined"
        />
        <DataTable
          columns={definitionColumns}
          keyField={'valueSet'}
          data={filteredDefinitionData as GrouperVSTableData[]}
          pagination
          paginationPerPage={10}
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TextField
          sx={{ backgroundColor: 'white', mb: 2, width: '240px', alignSelf: 'end' }}
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => setFilterExpansionText('')}>
                <ClearIcon sx={{ color: 'black', width: '20px', height: '20px' }} />
              </IconButton>
            )
          }}
          value={filterExpansionText}
          onChange={(e) => setFilterExpansionText(e.target.value)}
          id="filter-expansion-table"
          label="Filter Expansion Codes"
          variant="outlined"
        />
        <DataTable
          columns={expansionColumns}
          defaultSortFieldId={'code'}
          data={filteredExpansionData as ExpansionTableData[]}
          pagination
          paginationPerPage={10}
        />
      </TabPanel>
    </>
  )
}

export default ValueSetDetailsTables
