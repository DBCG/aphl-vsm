import { useMemo, useState } from 'react'
import { Tabs, Box, Tab, Typography } from '@mui/material'
import { useRouter } from 'next/router'
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

interface TableData {
  code: string
  display: string
}

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

interface ValueSetContentsProps {
  grouperLibrary: fhir4.Library
}

export default function ValueSetContents({ grouperLibrary, valueSet, programId }: any) {
  const [value, setValue] = useState(0)
  const router = useRouter()

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Member Code',
        selector: (row: TableData) => row.code!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Description',
        selector: (row: TableData) => row.display!,
        sortable: true,
        wrap: true
      }
    ]

    return fields
  }, [])

  if (valueSet == null || grouperLibrary == null) {
    return <LoadingIndicator />
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const [programUrl, programVersion] = grouperLibrary?.url?.split('|') || []

  const memberSet = valueSet?.compose?.include?.[0]
  const data = memberSet.concept

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ width: '100%', background: 'white' }}>
        <Form>
          <InputRow style={{ width: '100%' }}>
            <SearchInput id="prog-name" label="Title" readonly={true} def={valueSet.title} placeholder={'No valueset title set'} />
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
          <Typography variant="h6" sx={{ mt: 1, mb: 0 }}>
            Grouper Program
          </Typography>
          <InputRow style={{ width: '100%' }}>
            <SearchInput
              id="prog-url"
              label="URL"
              minWidth={650}
              readonly={true}
              def={programUrl}
              placeholder={'No program canonical set'}
            />
            <SearchInput id="prog-version" label="Version" readonly={true} def={programVersion} placeholder={'No program version set'} />
          </InputRow>
        </Form>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange}>
            <Tab label="Definition" {...a11yProps(0)} />
            <Tab label="Expansion" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <DataTable columns={columns} highlightOnHover={true} data={data} pagination paginationPerPage={10} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          Item Two
        </TabPanel>
      </Box>
    </Box>
  )
}
