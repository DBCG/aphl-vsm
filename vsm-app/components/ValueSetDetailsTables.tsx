import { useState, SetStateAction, Dispatch, useEffect, useMemo } from 'react'
import { Tabs, Box, Tab, Tooltip, TextField, IconButton, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { ProgramDetails } from '@/types/grouperTypes'
import ClearIcon from '@mui/icons-material/Clear'
import { DataItem, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useRouter } from 'next/router'
import { getProgramManifestVersions, isVSMOwnedVSet, organizeValueSetDefinitionData } from '@/helpers/valueSetHelpers'
import LoadingIndicator from './LoadingIndicator'
import TextLink from './TextLink'
import { ExpandRequest } from '@/pages/api/valueset/[id]/expand'
import { extractOidFromUrl } from '@/utils'
import styled from 'styled-components'
import { CodeBlock } from 'react-code-block'

const CB = ({ code }: {code: string}) => {
  return (
    <CodeBlock code={code} language='js'>
      <CodeBlock.Code className="bg-gray-900 p-6 rounded-xl shadow-lg">
        <CodeBlock.LineContent>
          <CodeBlock.Token />
        </CodeBlock.LineContent>
      </CodeBlock.Code>
    </CodeBlock>
  );
}

const StyledParagraph = styled.p`
  margin-bottom: .4rem;
  margin-top: 0rem;
  font-size: 90%;
`

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

interface GrouperTableDetail {
  title: string
  oid: string
  canonical: string
  version?: string
  valueSetPinnedVersion?: string | undefined
  valuesetId: string
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

interface GrouperTableDetail {
  title: string
  oid: string
  canonical: string
  version?: string
  valueSetPinnedVersion?: string | undefined
  valuesetId: string
  url?: string
}

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
  const [filterExpansionText, setFilterExpansionText] = useState('')
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(true)

  const { programValuesets } = useGetProgramValueSetDetails({ id: programAndGrouperInfo?.program?.id as string })

  useEffect(() => {
    if (programValuesets) {
      setIsLoadingDefinition(false)
    }
  }, [programValuesets])

  const router = useRouter()

  const leafDataForDisplay = (pData: any) => {
    return pData?.map((i: DataItem) => {
      return ({
        title: i?.valueSet?.title,
        oid: extractOidFromUrl(i?.valueSet?.url!),
        canonical: i?.canonical,
        version: i?.version,
        valuesetId: i?.valueSet?.id,
        valueSetPinnedVersion: i?.valueSetPinnedVersion
      })
    })
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const expandValueSet = async () => {
    setIsLoadingExpansion(true)
    const body: ExpandRequest['body'] = {
      valueSetId: currentValueSet.id,
      expansionParameters: getProgramManifestVersions(programAndGrouperInfo.program!)
    }
    try {
      let endpoint = `/api/valueset/${currentValueSet.id}/expand`
      if (router.query.pinnedVersion) {
        body.pinnedVersion = true
      }
      const updatedValueSet = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
  let expansionColumns = EXPANSION_COLUMNS

  if (timeStamp) {
    const timestampExpansionIndex = expansionColumns.findIndex((i) => i.name === 'Timestamp')
    const timestampColumn = {
      name: 'Timestamp',
      selector: (row: ExpansionTableData) => timeStamp!,
      sortable: true,
      wrap: true
    }
    if (timestampExpansionIndex > -1) {
      expansionColumns[timestampExpansionIndex] = timestampColumn
      expansionColumns = [...expansionColumns]
    } else {
      expansionColumns.push(timestampColumn)
    }
  }

  const formattedValueSetDefinitionData: { [key: string]: any } = organizeValueSetDefinitionData(currentValueSet)
  const generateValueSetColumns = (unionOrIntersection: 'union' | 'intersection') => {
    let valueSetColumns = []

    if (unionOrIntersection === 'union') {
      valueSetColumns = [
        {
          name: 'Canonical',
          selector: (row: any) => row?.url!,
          sortable: true,
          wrap: true,
          cell: (row: any) => {
            const base = isVsmGrouper ? row?.canonical : row?.url
            return (row?.valueSetPinnedVersion ? `${base}|${row?.valueSetPinnedVersion}` : `${base}`)
          }
        }
      ]
      // if it's a vsm grouper, we know more about the contents because we "own" the data
      if (isGrouperValueSet && isVSMOwnedVSet(currentValueSet)) {
        valueSetColumns.unshift(
          {
            name: 'Title',
            selector: (row: GrouperTableDetail) => row?.title!,
            sortable: true,
            wrap: true,
            // @ts-expect-error
            cell: (row: GrouperTableDetail) => {
              let href = `/programs/${programAndGrouperInfo?.program?.id}/valuesets/${row?.valuesetId}`
              if (!row.valueSetPinnedVersion) {
                href += '?pinnedVersion=true'
              }
              return (
                <TextLink
                  href={href}
                  linkText={row.title}
                  forceReload={true}
                />
              )
            }
          },
          {
            name: 'OID',
            selector: (row: GrouperTableDetail) => row?.oid!,
            sortable: true,
            wrap: true
          },
        )
      }
    } else {
      // otherwise, it's the intersection of the items
      valueSetColumns = [
        {
          name: 'Canonical',
          selector: (row: any) => row?.urls?.join(''),
          sortable: false,
          wrap: true,
          cell: (row: any) => {
            const items = row.urls.map((url: string) => <li key={url}>{url}</li>)
            return (
              <div>
                <p>The intersection (common elements) between:</p>
                <ul>
                  {...items}
                </ul>
              </div>
            )
          }
        }
      ]
    }
    return valueSetColumns
  }


  const filterColumns = [
    {
      name: 'Expression',
      selector: (row: any) => row?.filter!,
      sortable: false,
      wrap: true,
      cell: (row: any) => {
        return (
          <CB code={JSON.stringify(row?.filter)} />
        )
      }
    },
  ]

  const codeColumns = [
    {
      name: 'Code',
      selector: (row: any) => row?.code!,
      sortable: true,
      wrap: true,
      maxWidth: '5em'
    },
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
    }
  ]

  const columns = {
    valuesetUnion: generateValueSetColumns('union'),
    valuesetIntersection: generateValueSetColumns('intersection'),
    filterItems: filterColumns,
    codes: codeColumns
  }

  // valuesets in grouper only applies to VSM value sets
  const generateColumnsAndData = ({ currentVs, valueSetsInVsmGrouper }: { currentVs: fhir4.ValueSet, valueSetsInVsmGrouper: any }) => {
    const formattedVsmGrouperData = leafDataForDisplay(valueSetsInVsmGrouper)
    const formattedDefinitionData: { [key: string]: any } = organizeValueSetDefinitionData(currentVs)
    const columnsAndDataResult: { [key: string]: any } = {}
    Object.keys(formattedDefinitionData).forEach((key) => {
      const includeOrExclude = key
      // add arr if doesn't exist
      if (!columnsAndDataResult[includeOrExclude]) {
        columnsAndDataResult[includeOrExclude] = []
      }
      // find all non-empty subcategories for include or exclude data from valueset
      const existingDataCategories = Object.keys(formattedValueSetDefinitionData[key])?.filter(subcategory => formattedValueSetDefinitionData[key][subcategory].length)
      existingDataCategories.forEach((subcategory) => {
        // handle vsm grouper data differently
        columnsAndDataResult[includeOrExclude].push({
          subcategory,
          data: valueSetsInVsmGrouper ? formattedVsmGrouperData : formattedValueSetDefinitionData[key][subcategory]
        })
      })
    })
    return columnsAndDataResult
  }

  const isVsmGrouper = isGrouperValueSet && isVSMOwnedVSet(currentValueSet)
  const definitionColumnsAndData = generateColumnsAndData({
    currentVs: currentValueSet,
    valueSetsInVsmGrouper: isVsmGrouper ? programValuesets?.data : null
  })

  let expansionData = expansion?.contains

  const [tableFilters, setTableFilters] = useState<{ [key: string]: string }>({})

  const definitionContent = Object.keys(definitionColumnsAndData).map((includeOrExclude) => {
    const tables = definitionColumnsAndData[includeOrExclude]?.map((dataItem: any) => {
      const { subcategory, data } = dataItem
      let title = ''
      let filterTitle = ''
      let filterField: undefined | string

      const match = subcategory.toLowerCase()
      if (match.includes('valuesetintersection')) {
        title = 'Valueset Intersection'
        filterField = 'urls'
      } else if (match.includes('valuesetunion')) {
        title = 'Valuesets'
        filterField = 'url'
      } else if (match.includes('filter')) {
        title = 'Filters'
      } else if (match.includes('code')) {
        title = 'Codes'
        filterField = 'display'
      }

      if (filterField?.includes('url')) {
        filterTitle = 'canonical'
      } else {
        filterTitle = filterField || ''
      }

      const clearField = () => {
        const filters = { ...tableFilters }
        delete filters?.[subcategory]
        setTableFilters(filters)
      }

      const updateTableFilters = (text: any) => {
        const filters = { ...tableFilters }
        filters[subcategory] = text
        setTableFilters(filters)
      }

      const filterData = (filter: any) => {
        if (!filter) return data
        if (filterField === 'urls') {
          return data.filter((item: any) => item[filterField].join('').toLowerCase().includes(tableFilters[subcategory].toLowerCase()))
        } else {
          return filterField ? data.filter((item: any) => item[filterField].toLowerCase().includes(filter.toLowerCase())) : data
        } 
      }

      const result = (
        <Box key={`${includeOrExclude}-${subcategory}`} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

          <DataTable
            title={
              <Box style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem .4rem 0 0' }}>
                {/* @ts-expect-error */}
                <Typography variant='h7'>{title}</Typography>
                {filterField && (
                  <TextField
                    sx={{ backgroundColor: 'white', mb: 2, width: '240px', minWidth: '240px', alignSelf: 'end', justifySelf: 'flex-end' }}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={() => clearField()}>
                          <ClearIcon sx={{ color: 'black', width: '20px', height: '20px' }} />
                        </IconButton>
                      )
                    }}
                    value={tableFilters?.[subcategory] || ''}
                    onChange={(e) => updateTableFilters(e.target.value)}
                    id="filter-expansion-table"
                    label={`Filter by ${filterTitle}`}
                    variant="outlined"
                  />
                )}
              </Box>
            }
            // @ts-expect-error
            columns={columns[subcategory]}
            keyField={isGrouperValueSet ? 'url' : 'code'}
            data={filterData(tableFilters?.[subcategory])}
            pagination
            paginationPerPage={10}
            highlightOnHover={isGrouperValueSet}
            progressPending={isLoadingDefinition}
            progressComponent={<LoadingIndicator />}
          />
        </Box>
      )
      return result
    }).flat()

    return (
      <Box key={includeOrExclude} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: `${includeOrExclude === 'include' ? 'var(--light-success)' : 'var(--light-error)'}` }}>
        <Typography>
          The following are
          <b>{`${includeOrExclude === 'include' ? ' included ' : ' excluded '}`}</b>
          {`${includeOrExclude === 'include' ? ' in' : ' from'} this Valueset's definition:`}

        </Typography>
        {...tables}
      </Box>
    )
  }).flat()

  const isVsmVset = isVSMOwnedVSet(currentValueSet)
  const filteredExpansionData = expansionData?.filter((item) => item?.code?.toLowerCase().includes(filterExpansionText.toLowerCase())) || []

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleTabChange}>
          <Tab label="Definition" {...a11yProps(0)} />
          {!isVsmVset && <Tab label="Expansion" {...a11yProps(1)} />}
          {value === 1 && (
            <Box sx={{ ml: 'auto', mr: 3, display: 'flex' }}>
              {isDraftProgram && (
                <Box sx={{ mt: 1, mr: 1 }}>
                  <Tooltip title="Expansion is subject to change, program is in draft state" placement="top" arrow>
                    <WarningAmberIcon sx={{ color: '#FFA204' }} />
                  </Tooltip>
                </Box>
              )}
              <LoadingButton loading={isLoadingExpansion} onClick={() => expandValueSet()}>
                Generate Expansion
              </LoadingButton>
            </Box>
          )}
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        {...definitionContent}
      </TabPanel>
      <TabPanel value={value} index={1}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', flexDirection: 'column' }}>
          <div style={{ minWidth: '18rem' }}>
            <StyledParagraph>Expansions are dynamically generated based on your program&apos;s manifest.</StyledParagraph>
            <StyledParagraph style={{ marginBottom: '1rem' }}>In the manifest, authors specify which code system versions should be used to create the expansion.</StyledParagraph>
            <StyledParagraph>The latest expansion data is not persisted in the VSM.</StyledParagraph>
            <StyledParagraph>To see the latest expansion, regenerate using the button at top right.</StyledParagraph>
          </div>
          <TextField
            sx={{ backgroundColor: 'white', mb: 2, width: '240px', minWidth: '240px', alignSelf: 'end', justifySelf: 'flex-end' }}
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
        </div>
        <DataTable
          columns={expansionColumns}
          keyField={'code'}
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
