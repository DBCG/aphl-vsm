import { useState } from 'react'
import DataTable, { TableColumn } from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { getNameByUri, namesByUri } from '@/pages/programs/[id]/manifest'
import { ManifestDataMap, ManifestSystemVersionPair } from '@/types/manifestTypes'
import { customTableStyles } from './tables/themes'
import InfoIcon from '@mui/icons-material/Info'
import { Typography, Modal, Tooltip, Box, Button } from '@mui/material'

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
      omit: !deleteFn,
      maxWidth: '50px',
      cell: (row: ManifestSystemVersionPair) => {
        return (
          <IconButton
            data-delete-manifest={`${row.system}|${row.version}`}
            deletedItemDescription={`system "${row.system}" version ${row.version}`}
            onClick={() => deleteFn(row)}
            buttoncontext="delete"
            style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
          />
        )
      },
      sortable: true,
      wrap: true
    },
    {
      name: 'Update Available',
      maxWidth: '200px',
      omit: noUpdatesAvailable,
      sortable: true,
      cell: (row: ManifestSystemVersionPair) => {
        const matchingVs = availableUpdates.find(
          (vs: fhir4.ValueSet) => vs.url === row.system && vs.version !== row.version && !vs?.version?.toLowerCase().includes('provisional')
        )
        if (matchingVs) {
          console.log(matchingVs)
          return (
            <>
              <IconButton
                data-update-manifest={`${row.system}|${row.version}`}
                onClick={() => setTargetedVsToUpdate(matchingVs)}
                buttoncontext="update"
                style={{ backgroundColor: 'darkGreen', margin: '0 auto' }}
              />
              <Tooltip title={matchingVs?.version}>
                <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
              </Tooltip>
            </>
          )
        } else {
          return null
        }
      },
      wrap: true
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
            <Button
              sx={{ ml: 2 }}
              onClick={() => {
                updateFn(targetedVsToUpdate?.version, targetedVsToUpdate?.url)
                setTargetedVsToUpdate(null)
              }}
            >
              Update
            </Button>
            <Button onClick={() => setTargetedVsToUpdate(null)}>Cancel</Button>
          </Box>
        </Box>
      </Modal>
      <DataTable
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
