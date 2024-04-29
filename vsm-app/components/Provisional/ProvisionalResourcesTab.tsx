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
  const router = useRouter()

  const shouldDisableButton = Boolean((provisionalType === 'Value Set') && !csExists)

  return (
    <Box sx={{ flexGrow: 1, justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'middle', padding: '2rem', alignSelf: 'stretch' }}>
      <Typography style={{ display: 'block', textAlign: 'center' }}>{ `No Provisional ${provisionalType}s found in VSM` }</Typography>
      <div style={{ display: 'flex', flexGrow: 1, padding: '2rem' }}>
        <Button disabled={shouldDisableButton} style={{ justifySelf: 'center', margin: '0 auto'}} onClick={() => router.push(`/provisional/${provisionalType.toLowerCase().replace(' ', '')}`)}>Create New</Button>
      </div>
    </Box>
  )
}

interface ProvisionalCS {
  provisionalCS: fhir4.CodeSystem[]
}

const ProvisionalCodeSystemsTable = ({ provisionalCS }: ProvisionalCS) => {
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
              Edit
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
      <DataTable title='VSM Provisional Code Systems' data={provisionalCS} columns={codeSystemColumns} noDataComponent={<NoProvisionalData provisionalType='Code System'/>}/>
    </div>
  )
}

interface ProvisionalVS {
  provisionalVS: fhir4.ValueSet[]
  csExists: boolean
}

const ProvisionalValueSetsTable = ({ provisionalVS, csExists }: ProvisionalVS) => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }

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
              Edit
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
        columns={columns}
        noDataComponent={<NoProvisionalData
          csExists={csExists}
          provisionalType='Value Set'/>
        }/>
    </div>
  )
}


const ProvisionalResourcesTab = () => {
  const provisionalVS = useGetProvisionalVS()
  const provisionalCS = useGetProvisionalCS()
  const router = useRouter()
  return (
    <Box sx={{ flexGrow: 1 }}>
      <ProvisionalVSDescription/>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <div style={{ backgroundColor: 'white' }}>
            <ProvisionalCodeSystemsTable provisionalCS={provisionalCS}/>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button style={{ margin: '1rem auto' }} onClick={() => router.push(`/provisional/codesystem`)}>+ Create New</Button>
            </div>
          </div>
        </Grid>
        <Grid item xs={12}>
          <div style={{ backgroundColor: 'white'}}>
            <ProvisionalValueSetsTable csExists={Boolean(provisionalCS?.length)} provisionalVS={provisionalVS}/>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button style={{ margin: '1rem auto' }} onClick={() => router.push(`/provisional/valueset`)}>+ Create New</Button>
            </div>
          </div>
        </Grid>
      </Grid>
    </Box>
  )
}

export { ProvisionalResourcesTab }