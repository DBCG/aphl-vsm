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

interface GrouperVSTableData {
  valueSet: string[]
}

interface ExpansionTableData {
  system: string
  version: string
  code: string
  timestamp?: string
}

interface StringMap {
  [key: string]: string | undefined
}

interface ValueSetContentsProps {
  programAndGrouperInfo: ProgramDetails
  isGrouperValueSet: boolean
  setToggleUpdateData: Dispatch<SetStateAction<boolean>>
  valueSet: fhir4.ValueSet
  programId: string
  enableEditing: boolean
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

interface MetadataResult {
  version?: string
  description?: string
  publisher?: string
  purpose?: string
  author?: string
}

export default function ValueSetContents({
  programAndGrouperInfo,
  setToggleUpdateData,
  isGrouperValueSet,
  valueSet,
  isDraftProgram = false,
  programId,
  enableEditing
}: ValueSetContentsProps) {
  const [value, setValue] = useState(0) // Used for tabs
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingExpansion, setIsLoadingExpansion] = useState(false)
  const [currentValueSet, setCurrentValueSet] = useState(valueSet)

  const {
    version: defaultGrouperVersion,
    description: defaultGrouperDescription,
    publisher: defaultGrouperPublisher,
    purpose: defaultGrouperPurpose
  } = valueSet

  // could be multiple authors maybe?
  const defaultGrouperAuthor =
    valueSet?.extension?.find((ext) => ext?.url?.endsWith('/StructureDefinition/valueset-author'))?.valueContactDetail?.name || ''

  const [grouperVersion, setGrouperVersion] = useState(defaultGrouperVersion)
  const [grouperDescription, setGrouperDescription] = useState(defaultGrouperDescription)
  const [grouperPurpose, setGrouperPurpose] = useState(defaultGrouperPurpose)
  const [grouperPublisher, setGrouperPublisher] = useState(defaultGrouperPublisher)
  const [grouperAuthor, setGrouperAuthor] = useState(defaultGrouperAuthor)
  const [changedMetadataItems, setChangedMetadataItems] = useState({})

  useEffect(() => {
    const metadataItemsChanged: MetadataResult = {}

    if (defaultGrouperVersion?.trim() !== grouperVersion?.trim()) {
      metadataItemsChanged.version = grouperVersion?.trim()
    }
    if (defaultGrouperDescription?.trim() !== grouperDescription?.trim()) {
      metadataItemsChanged.description = grouperDescription?.trim()
    }
    if (defaultGrouperPurpose?.trim() !== grouperPurpose?.trim()) {
      metadataItemsChanged.purpose = grouperPurpose?.trim()
    }
    if (defaultGrouperPublisher?.trim() !== grouperPublisher?.trim()) {
      metadataItemsChanged.publisher = grouperPublisher?.trim()
    }
    if (defaultGrouperAuthor?.trim() !== grouperAuthor?.trim()) {
      metadataItemsChanged.author = grouperAuthor?.trim()
    }

    setChangedMetadataItems(metadataItemsChanged)
  }, [
    grouperVersion,
    grouperDescription,
    grouperPurpose,
    grouperPublisher,
    grouperAuthor,
    defaultGrouperVersion,
    defaultGrouperDescription,
    defaultGrouperPurpose,
    defaultGrouperPublisher,
    defaultGrouperAuthor
  ])

  const [error, setError] = useState<null | Error>(null)

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
    const metadataItems: StringMap = {
      version: grouperVersion?.trim(),
      description: grouperDescription?.trim(),
      purpose: grouperPurpose?.trim(),
      publisher: grouperPublisher?.trim(),
      author: grouperAuthor.trim()
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

    // check that there are fields to change
    if (!Object.keys(changedMetadataItems).length) {
      setError({
        type: 'no-fields-changed',
        message: 'No fields were changed, update cancelled.'
      })
      return
    }

    const body = {
      metadata: changedMetadataItems,
      originalGrouperVersion: defaultGrouperVersion,
      grouperId: valueSet.id
    }

    const submitResponse = await fetch(`/api/programs/${programId}/grouper/valueset`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    if (submitResponse.ok) {
      setToggleUpdateData((t: boolean) => !t)
    } else {
      toast.error('Failed to update grouper')
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

  const programUrl = programAndGrouperInfo?.program?.url
  const programVersion = programAndGrouperInfo?.program?.version
  const memberSet = currentValueSet?.compose?.include
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
              <SearchInput
                id="vs-id"
                label={isGrouperValueSet ? 'Grouper ID' : 'Valueset ID'}
                readonly={true}
                def={valueSet.id}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} id set`}
              />
              {isGrouperValueSet && enableEditing && !isEditing && (
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
                    disabled={!Boolean(Object.keys(changedMetadataItems).length)}
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
                label={isGrouperValueSet ? 'Grouper Version' : 'Valueset Version'}
                readonly={!isEditing}
                value={grouperVersion}
                def={defaultGrouperVersion}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} version set`}
                onChange={(e) => setGrouperVersion(e.target.value)}
              />
            </InputRow>
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-url"
                label={'URL'}
                readonly={true}
                value={currentValueSet.url}
                def={currentValueSet.url}
                placeholder={`No ${isGrouperValueSet ? 'Groupper' : 'Valueset'} url set`}
              />
            </InputRow>
            {!isGrouperValueSet && (
              <InputRow style={{ width: '100%' }}>
                <SearchInput
                  id="vs-oid"
                  label={'OID'}
                  readonly={true}
                  value={getOid(currentValueSet)}
                  def={getOid(currentValueSet)}
                  placeholder={'No valueset oid was set'}
                />
              </InputRow>
            )}
            <InputRow style={{ width: '100%' }}>
              <SearchInput
                id="vs-publisher"
                label="Publisher"
                minWidth={650}
                readonly={!isEditing}
                value={grouperPublisher}
                def={defaultGrouperPublisher}
                placeholder={'No valueset publisher set'}
                onChange={(e) => setGrouperPublisher(e.target.value)}
              />
              <SearchInput
                id="vs-author"
                label="Author"
                minWidth={650}
                readonly={!isEditing}
                value={grouperAuthor}
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
                value={grouperPurpose}
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
                value={grouperDescription}
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
