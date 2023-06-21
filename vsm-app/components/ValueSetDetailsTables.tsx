import { useState, useEffect, SetStateAction, Dispatch } from 'react'
import { Tabs, Box, Tab, Tooltip, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { Button } from './buttons/Button'
import LoadingIndicator from './LoadingIndicator'
import { Form } from './ProgramMetadata/styles'
import { SearchInput } from '@/components/SearchInput'
import { ProgramDetails } from '@/types/grouperTypes'
import { InputRow, InputContainer, ButtonContainer } from '@/styles'
import { TextArea } from './TextArea'
import { getOid } from '@/helpers/valueSetHelpers'

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

interface GrouperVSTableData {
  valueSet: string[]
}

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

interface ValueSetDetailsTablesProps {
  setCurrentValueSet: Dispatch<SetStateAction<any>>
  programAndGrouperInfo: ProgramDetails
  currentValueSet: fhir4.ValueSet
  isGrouperValueSet: boolean
  isDraftProgram: boolean
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
      console.error(e)
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

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleTabChange}>
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
        <DataTable
          columns={definitionColumns}
          keyField={'valueSet'}
          data={definitionData as GrouperVSTableData[]}
          pagination
          paginationPerPage={10}
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <DataTable
          columns={expansionColumns}
          defaultSortFieldId={'code'}
          data={expansionData as ExpansionTableData[]}
          pagination
          paginationPerPage={10}
        />
      </TabPanel>
    </>
  )
}

export default ValueSetDetailsTables
