import { useState } from 'react'
import DataTable, { TableColumn } from 'react-data-table-component'
import InfoIcon from '@mui/icons-material/Info'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { getNameByUri, namesByUri } from '@/pages/programs/[id]/manifest'
import { ManifestDataMap, ManifestSystemVersionPair } from '@/types/manifestTypes'
import { customTableStyles } from './tables/themes'
import { Typography, Modal, Tooltip, Box, Button as MuiButton } from '@mui/material'

const prepData = (data: ManifestDataMap) => {
  if (!data) return []
  const preparedData: ManifestSystemVersionPair[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version, id: `${system}|${version}` }))
  })
  return preparedData
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4
}

const NoDataComponent = () => {
  return (
  <div style={{ display: 'flex', width: '100%', padding: '2rem 4rem', backgroundColor: 'white', justifyContent: 'center' }}>
    <Typography style={{ textAlign: 'center' }}>No manifest data found</Typography>
  </div>

  )
}

const ManifestDetailTable = ({ deleteFn, updateFn, data: manifestData, loading, programId, availableUpdates }: any) => {
  const preppedData = prepData(manifestData)
  const [targetedVsToUpdate, setTargetedVsToUpdate] = useState<fhir4.ValueSet | null>(null)
  const { data: systemAndVersionData = [] } = useSWR(`/api/programs/${programId}/manifest`, fetcher, { revalidateOnFocus: false })

  const allSystemNamesByUri = namesByUri(systemAndVersionData)
  const noUpdatesAvailable = !Boolean(availableUpdates?.length)

  const columns: TableColumn<ManifestSystemVersionPair>[] = [
    {
      name: 'Name',
      selector: (row: ManifestSystemVersionPair) => getNameByUri(row.system!, allSystemNamesByUri),
      sortable: true,
      wrap: true,
      maxWidth: '200px'
    },
    {
      name: 'System',
      selector: (row: ManifestSystemVersionPair) => row.system!,
      sortable: true,
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: ManifestSystemVersionPair) => row.version!,
      sortable: true,
      wrap: true
    },
    {
      name: 'Remove',
      center: true,
      omit: !deleteFn,
      maxWidth: '50px',
      cell: (row: ManifestSystemVersionPair) => {
        return (
          <IconButton
            data-delete-manifest={`${row.system}|${row.version}`}
            deletedItemDescription={`system "${row.system}" version ${row.version}`}
            onClick={() => deleteFn(row)}
            buttoncontext="delete"
            style={{ backgroundColor: 'darkRed' }}
          />
        )
      },
      sortable: false,
      style: {
        alignContent: 'space-around',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    },
    {
      name: 'Update to Latest',
      maxWidth: '200px',
      omit: noUpdatesAvailable,
      sortable: false,
      center: true,
      cell: (row: ManifestSystemVersionPair) => {
        const matchingVs = availableUpdates.find(
          (vs: fhir4.ValueSet) => vs.url === row.system && vs.version !== row.version && !vs?.version?.toLowerCase().includes('provisional')
        )
        if (matchingVs) {
          return (
            <div style={{ position: 'relative' }}>
              <IconButton
                data-update-manifest={`${row.system}|${row.version}`}
                onClick={() => setTargetedVsToUpdate(matchingVs)}
                buttoncontext='update'
              />
              <Tooltip
                title={`Update to version: ${matchingVs.version}`}
                style={{ position: 'absolute', top: '-1em', right: '-0.5em' }}
              >
                <InfoIcon sx={{ color: 'var(--theme-400)', ml: 'auto', width: '20px', height: '20px' }} />
              </Tooltip>
            </div>
          )
        } else {
          return null
        }
      },
      wrap: false,
      style: {
        display: 'flex',
        alignContent: 'space-around',
        justifyContent: 'center'
      }
    }
  ]

  return (
    <>
      <Modal
        open={targetedVsToUpdate != null}
        onClose={() => setTargetedVsToUpdate(null)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Confirm Update
          </Typography>
          <Typography sx={{ mt: 2, display: 'block' }} variant="body1">
            Do you want to upgrade to the latest version of <b>{targetedVsToUpdate?.title}</b> to version:{' '}
            <b>{targetedVsToUpdate?.version}</b>?
          </Typography>
          <Box sx={{ display: 'flex', mt: 3, flexDirection: 'row-reverse' }}>
            <MuiButton
              sx={{ ml: 2 }}
              onClick={() => {
                updateFn(targetedVsToUpdate?.version, targetedVsToUpdate?.url)
                setTargetedVsToUpdate(null)
              }}
            >
              Update
            </MuiButton>
            <MuiButton onClick={() => setTargetedVsToUpdate(null)}>Cancel</MuiButton>
          </Box>
        </Box>
      </Modal>
      <DataTable
        noDataComponent={<NoDataComponent/>}
        progressComponent={<LoadingIndicator />}
        progressPending={loading}
        columns={columns}
        highlightOnHover
        customStyles={customTableStyles('readonly')}
        data={preppedData}
        pagination
        paginationPerPage={10}
        theme="aphl"
      />
    </>
  )
}

export default ManifestDetailTable
