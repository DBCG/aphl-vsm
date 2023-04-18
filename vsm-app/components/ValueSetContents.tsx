import { useState, useEffect } from 'react'
import { Tabs, Box, Tab, Tooltip, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { Button } from './buttons/Button'
import LoadingIndicator from './LoadingIndicator'
import { Form, TitleRow } from './ProgramMetadata/styles'
import { SearchInput } from '@/components/SearchInput'
import { ProgramDetails } from '@/types/grouperTypes'
import { InputRow, InputContainer, ButtonContainer } from '@/styles'
import { TextArea } from './TextArea'
import { useRouter } from 'next/router'

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
  programAndGrouperInfo: ProgramDetails
  setToggleUpdateData: () => void
  valueSet: fhir4.ValueSet
  programId: string
  enableEditing: boolean
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

interface Error {
  type: string
  message: string
}

export default function ValueSetContents({
  programAndGrouperInfo,
  setToggleUpdateData,
  valueSet,
  isDraftProgram = false,
  programId,
  enableEditing
}: ValueSetContentsProps) {
  const [value, setValue] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingExpansion, setIsLoadingExpansion] = useState(false)
  const [fieldsUpdated, setFieldsUpdated] = useState(false)
  const [currentValueSet, setCurrentValueSet] = useState(valueSet)

  console.log('program and grouper info: ', programAndGrouperInfo)

  const {
    version: defaultGrouperVersion,
    description: defaultGrouperDescription,
    publisher: defaultGrouperPublisher,
    purpose: defaultGrouperPurpose
  } = valueSet

  // could be multiple authors maybe?
  const defaultGrouperAuthor =
    valueSet?.extension?.find((ext) => ext?.url?.endsWith('/StructureDefinition/valueset-author'))?.valueContactDetail?.name || ''

  console.log('default author ', defaultGrouperAuthor)
  console.log('valueset.extension', valueSet.extension)

  const [updatedGrouperVersion, setGrouperVersion] = useState(defaultGrouperVersion)
  const [updatedGrouperDescription, setGrouperDescription] = useState(defaultGrouperDescription)
  const [updatedGrouperPurpose, setGrouperPurpose] = useState(defaultGrouperPurpose)
  const [updatedGrouperPublisher, setGrouperPublisher] = useState(defaultGrouperPublisher)
  const [updatedGrouperAuthor, setGrouperAuthor] = useState(defaultGrouperAuthor)

  useEffect(() => {
    if (
      defaultGrouperVersion?.trim() !== updatedGrouperVersion?.trim() ||
      defaultGrouperDescription?.trim() !== updatedGrouperDescription?.trim() ||
      defaultGrouperPurpose?.trim() !== updatedGrouperPurpose?.trim() ||
      defaultGrouperPublisher?.trim() !== updatedGrouperPublisher?.trim() ||
      defaultGrouperAuthor?.trim() !== updatedGrouperAuthor?.trim()
    ) {
      setFieldsUpdated(true)
    } else {
      setFieldsUpdated(false)
    }
  }, [
    updatedGrouperVersion,
    updatedGrouperDescription,
    updatedGrouperPurpose,
    updatedGrouperPublisher,
    updatedGrouperAuthor,
    defaultGrouperVersion,
    defaultGrouperDescription,
    defaultGrouperPurpose,
    defaultGrouperPublisher,
    defaultGrouperAuthor
  ])

  const [error, setError] = useState<null | Error>(null)

  const router = useRouter()

  if (valueSet == null || programAndGrouperInfo?.grouperLibrary == null) {
    return <LoadingIndicator />
  }

  const resetValues = () => {
    setGrouperVersion(defaultGrouperVersion)
    setGrouperDescription(defaultGrouperDescription)
    setGrouperPurpose(defaultGrouperPurpose)
    setGrouperPublisher(defaultGrouperPublisher)
    setGrouperAuthor(defaultGrouperAuthor)
  }

  const submitGrouperUpdates = async () => {
    const metadataItems = {
      version: updatedGrouperVersion?.trim(),
      description: updatedGrouperDescription?.trim(),
      purpose: updatedGrouperPurpose?.trim(),
      publisher: updatedGrouperPublisher?.trim(),
      author: updatedGrouperAuthor.trim()
    }

    // check that no fields empty
    const fieldIsEmpty = Object.values(metadataItems).find((val) => !Boolean(val))

    if (fieldIsEmpty) {
      setError({
        type: 'no-data',
        message: 'All fields required.'
      })
      return
    }

    const flatKeys = ['version', 'description', 'purpose', 'publisher']

    // only send changed fields to the server for updating
    flatKeys.forEach((key) => {
      if (metadataItems[key] === valueSet[key]) {
        delete metadataItems[key]
      }
    })

    // author is an extension to check it separately
    if (defaultGrouperAuthor === updatedGrouperAuthor) {
      delete metadataItems['author']
    }

    // check that there are fields to change
    if (!Object.keys(metadataItems).length) {
      setError({
        type: 'no-fields-changed',
        message: 'No fields were changed, update cancelled.'
      })
      return
    }

    const body = {
      metadata: metadataItems,
      originalGrouperVersion: defaultGrouperVersion,
      grouperId: valueSet.id
    }

    const submitResponse = await fetch(`/api/programs/${programId}/grouper/valueset`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    if (submitResponse.ok) {
      console.log('ok')
      setToggleUpdateData((t: boolean) => !t)
    } else {
      console.log('response: ', submitResponse)
    }
    setIsEditing(false)
  }

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
    <Box>
      <Box sx={{ width: '100%', backgroundColor: 'var(--theme-100)', padding: '24px' }}>
        <Form>
          <PageTitle>{currentValueSet.title}</PageTitle>
          <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
            <SearchInput
              id="prog-id"
              label="Program ID"
              readonly={true}
              def={programAndGrouperInfo?.program?.id || 'No ID found'}
              placeholder={'No valueset id set'}
            />
            {isDraftProgram && (
              <Typography
                style={{
                  background: '#FAA024',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '20px',
                  height: 'max-content'
                }}
              >
                Draft
              </Typography>
            )}
          </InputRow>
          <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
            <SearchInput
              id="prog-name"
              label="Program Name"
              readonly={true}
              def={programAndGrouperInfo?.program?.name || 'No name found'}
              placeholder={'No valueset id set'}
            />
          </InputRow>
          <InputRow style={{ width: '100%', backgroundColor: 'white', paddingTop: '12px', paddingBottom: '12px' }}>
            <SearchInput
              id="prog-url"
              label="Program URL"
              minWidth={650}
              readonly={true}
              def={programUrl}
              placeholder={'No program canonical set'}
            />
            <SearchInput
              id="prog-version"
              label="Program Version"
              readonly={true}
              def={programVersion}
              placeholder={'No program version set'}
            />
          </InputRow>
          <InputContainer>
            <InputRow style={{ width: '100%', justifyContent: 'space-between' }}>
              <SearchInput id="prog-name" label="Grouper ID" readonly={true} def={valueSet.id} placeholder={'No valueset id set'} />
              {enableEditing && !isEditing && (
                <Button
                  text="Edit Metadata"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsEditing(true)
                  }}
                />
              )}
              {enableEditing && isEditing && (
                <ButtonContainer>
                  <Button
                    text="Cancel"
                    style={{ backgroundColor: 'darkGray' }}
                    onClick={(e) => {
                      resetValues()
                      e.preventDefault()
                      setIsEditing(false)
                    }}
                  />
                  <Button
                    disabled={!fieldsUpdated}
                    text="Save Changes"
                    onClick={async (e) => {
                      e.preventDefault()
                      await submitGrouperUpdates()
                    }}
                  />
                </ButtonContainer>
              )}
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-version"
                label="Grouper Version"
                readonly={!isEditing}
                value={updatedGrouperVersion}
                def={defaultGrouperVersion}
                placeholder={'No valueset version set'}
                onChange={(e) => setGrouperVersion(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-publisher"
                label="Publisher"
                minWidth={650}
                readonly={!isEditing}
                value={updatedGrouperPublisher}
                def={defaultGrouperPublisher}
                placeholder={'No valueset publisher set'}
                onChange={(e) => setGrouperPublisher(e.target.value)}
              />
              <SearchInput
                id="vs-author"
                label="Author"
                minWidth={650}
                readonly={!isEditing}
                value={updatedGrouperAuthor}
                def={defaultGrouperAuthor}
                placeholder={'No valueset author set'}
                onChange={(e) => setGrouperAuthor(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <TextArea
                id="vs-purpose"
                label="Purpose"
                minWidth={650}
                readonly={!isEditing}
                value={updatedGrouperPurpose}
                def={defaultGrouperPurpose}
                placeholder={'No valueset purpose set'}
                onChange={(e) => setGrouperPurpose(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <TextArea
                id="vs-description"
                label="Description"
                minWidth={650}
                readonly={!isEditing}
                value={updatedGrouperDescription}
                def={defaultGrouperDescription}
                placeholder={'No valueset description set'}
                onChange={(e) => setGrouperDescription(e.target.value)}
              />
            </InputRow>
          </InputContainer>
        </Form>
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
          <DataTable columns={definitionColumns} data={definitionData as GrouperVSTableData[]} pagination paginationPerPage={10} />
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
      </Box>
    </Box>
  )
}
