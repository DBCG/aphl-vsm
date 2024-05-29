import { useGetProvisionalCS } from '@/hooks/useGetProvisionalCS'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import ProvisionalVSDescription from './ProvisionalVsDescription'
import { useMemo } from 'react'
import DataTable from 'react-data-table-component'
import { Button, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { useGetProvisionalVS } from '@/hooks/useGetProvisionalVS'
import { getVsAuthor } from '@/helpers/valueSetHelpers'
import { formatResourceDate } from '@/helpers/formatDates'
import { VSMSession, can } from '@/helpers/rolesHelper'
import { useSession } from 'next-auth/react'

interface ProvisionalType {
  provisionalType: 'Value Set' | 'Code System'
  csExists?: boolean
}

const NoProvisionalData = ({ provisionalType, csExists }: ProvisionalType) => {
  return (
    <Box sx={{ flexGrow: 1, justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'middle', padding: '2rem', alignSelf: 'stretch' }}>
      <Typography style={{ display: 'block', textAlign: 'center' }}>{ `No Provisional ${provisionalType}s found in VSM` }</Typography>
      <div style={{ display: 'flex', flexGrow: 1, padding: '2rem' }}>
      </div>
    </Box>
  )
}

interface ProvisionalCS {
  provisionalCS: fhir4.CodeSystem[] | undefined
  canEdit: boolean
  isLoading: boolean
}

const ProvisionalCodeSystemsTable = ({ provisionalCS=[], canEdit, isLoading }: ProvisionalCS) => {
  const router = useRouter()
  const codeSystemColumns = useMemo(() => {
    const fields = [
      { 
        name: 'Name',
        selector: (row: fhir4.CodeSystem) => row.name || 'No Name'
      },
      {
        name: 'URL',
        wrap: true,
        selector: (row: fhir4.CodeSystem) => row.url || 'No URL'
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.CodeSystem) => formatResourceDate({ resource: row, dateType: 'lastUpdated'}) || 'No date provided'
      },
      {
        name: 'Action',
        selector: (row: fhir4.ValueSet) => row.id,
        cell: (row: fhir4.ValueSet) => {
          return (
          <Box>
            {/* maybe pass thru row id as prop to default the edit? */}
            <Button
              onClick={() => router.push(`/provisional/codesystem?csSelected=${row.url}`)}
            >
              { canEdit ? 'Edit' : 'View' }
            </Button>
          </Box>

          )
        }
      },
    ]
    return fields
  }, [provisionalCS])
  return (
    <div>
      {/* @ts-ignore */}
      <DataTable pagination title='VSM Provisional Code Systems' data={provisionalCS} columns={codeSystemColumns} noDataComponent={<NoProvisionalData provisionalType='Code System'/>}/>
    </div>
  )
}

interface ProvisionalVS {
  provisionalVS: fhir4.ValueSet[]
  csExists: boolean
  canEdit: boolean
  isLoading: boolean
}

const ProvisionalValueSetsTable = ({ provisionalVS, csExists, canEdit, isLoading }: ProvisionalVS) => {
  const router = useRouter()

  const columns = useMemo(() => {
    const fields = [
      { 
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row.title || 'No Title Specified'
      },
      {
        name: 'Author',
        selector: (row: fhir4.ValueSet) => getVsAuthor(row)
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.ValueSet) => formatResourceDate({ resource: row, dateType: 'lastUpdated' }) || 'No Date Specified'
      },
      {
        name: 'Action',
        selector: (row: fhir4.ValueSet) => row.id,
        cell: (row: fhir4.ValueSet) => {
          return (
          <Box>
            {/* maybe pass thru row id as prop to default the edit? */}
            <Button
              onClick={() => router.push(`/provisional/valueset?vsSelected=${row.id}`)}
            >
              { canEdit ? 'Edit' : 'View' }
            </Button>
          </Box>

          )
        }
      },
    ]
    return fields
  }, [provisionalVS])

  return (
    <div>
      <DataTable
        title='VSM Provisional Value Sets'
        data={provisionalVS}
        loading={isLoading}
        pagination
        // @ts-ignore
        columns={columns}
        noDataComponent={<NoProvisionalData
        csExists={csExists}
        provisionalType='Value Set'/>
        }/>
    </div>
  )
}


const ProvisionalResourcesTab = () => {
  const vsData = useGetProvisionalVS()
  const { provisionalVS, isVsLoading } = vsData
  const csData = useGetProvisionalCS()
  const { provisionalCS, isCsLoading } = csData
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const canEdit = can(session, 'edit')
  const router = useRouter()
  return (
    <Box sx={{ flexGrow: 1 }}>
      <ProvisionalVSDescription/>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <div style={{ backgroundColor: 'white' }}>
            <ProvisionalCodeSystemsTable isLoading={Boolean(isCsLoading)} provisionalCS={provisionalCS} canEdit={canEdit}/>
            { canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <Button style={{ margin: '1rem auto' }} onClick={() => router.push(`/provisional/codesystem`)}>+ Create New</Button>
              </div>
            )}
          </div>
        </Grid>
        <Grid item xs={12}>
          <div style={{ backgroundColor: 'white'}}>
            <ProvisionalValueSetsTable isLoading={Boolean(isVsLoading)} csExists={Boolean(provisionalCS?.length)} provisionalVS={provisionalVS} canEdit={canEdit}/>
            { canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <Button style={{ margin: '1rem auto' }} onClick={() => router.push(`/provisional/valueset`)}>+ Create New</Button>
              </div>
            )}
          </div>
        </Grid>
      </Grid>
    </Box>
  )
}

export { ProvisionalResourcesTab }