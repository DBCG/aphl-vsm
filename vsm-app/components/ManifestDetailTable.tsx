import { useState, useMemo } from 'react'
import DataTable, { TableColumn } from 'react-data-table-component'
import InfoIcon from '@mui/icons-material/Info'
import { IconButton } from './buttons/IconButton'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { ManifestSystemVersionPair, SelectedManifestDataVersion } from '@/types/manifestTypes'
import { customTableStyles } from './tables/themes'
import { Typography, Modal, Tooltip, Box, Button as MuiButton, TextField, InputAdornment } from '@mui/material'
import { modalStyle } from '@/styles'
import { namesByUri, getNameByUri } from './EditManifestDetails/manifestHelpers'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'

const prepData = (data: SelectedManifestDataVersion) => {
  if (!data) return []
  const preparedData: ManifestSystemVersionPair[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version, id: `${system}|${version}` }))
  })
  return preparedData
}

const NoDataComponent = ({ isFiltered }: { isFiltered?: boolean }) => {
  return (
    <div style={{ display: 'flex', width: '100%', padding: '1.2rem', backgroundColor: 'white', justifyContent: 'center' }}>
      <Typography style={{ textAlign: 'center' }}>
        {isFiltered ? 'No entries match your filter' : 'No manifest data found'}
      </Typography>
    </div>
  )
}

type ManifestDetailTableProps = {
  deleteFn?: Function
  updateFn?: Function
  manifestData: SelectedManifestDataVersion
  programId: string
  availableUpdates?: ManifestSystemVersionPair[]
  resourceType?: 'program' | 'vsp' // NEW: specify resource type
}

const ManifestDetailTable = ({ deleteFn, updateFn, manifestData, programId, availableUpdates, resourceType = 'program' }: ManifestDetailTableProps) => {
  const [targetedCsToUpdate, setTargetedCsToUpdate] = useState<ManifestSystemVersionPair | null>(null)
  const [filterText, setFilterText] = useState('')

  // Use the correct API endpoint based on resource type
  const manifestEndpoint = programId
    ? (resourceType === 'vsp'
        ? `/api/value-set-packages/${programId}/manifest`
        : `/api/programs/${programId}/manifest`)
    : null

  const { data: systemAndVersionData = [] } = useSWR(manifestEndpoint, fetcher)
  const preppedData = prepData(manifestData)

  const allSystemNamesByUri = namesByUri(systemAndVersionData)
  const noUpdatesAvailable = !Boolean(availableUpdates?.length)

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!filterText) return preppedData

    const searchLower = filterText.toLowerCase()
    return preppedData.filter((item) => {
      const name = getNameByUri(item.system!, allSystemNamesByUri)?.toLowerCase() || ''
      const system = item.system?.toLowerCase() || ''
      const version = item.version?.toLowerCase() || ''

      return name.includes(searchLower) ||
             system.includes(searchLower) ||
             version.includes(searchLower)
    })
  }, [preppedData, filterText, allSystemNamesByUri])

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
      // cell: (row: ManifestSystemVersionPair) => {
      //   const isLatest = !Boolean(availableUpdates?.find(
      //     (vs: fhir4.ValueSet) => vs.url === row.system && vs.version !== row.version && !vs?.version?.toLowerCase().includes('provisional')
      //   ))
      //   return (
      //     <div>
      //       <p style={{ marginBottom: '0', marginTop: '0' }}>{row.version}</p>
      //       { isLatest && <i>(latest)</i> }
      //     </div>
      //   )
      // },
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
            // @ts-ignore - will be omitted from being displayed if not defined
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
      name: 'Pin to Latest',
      maxWidth: '200px',
      omit: noUpdatesAvailable,
      sortable: false,
      center: true,
      cell: (row: ManifestSystemVersionPair) => {
        const matchingCodeSystem = availableUpdates?.find(
          (cs: ManifestSystemVersionPair) =>
            cs.system === row.system && cs.version !== row.version && !cs?.version?.toLowerCase().includes('provisional')
        )
        if (matchingCodeSystem) {
          return (
            <div style={{ position: 'relative' }}>
              <IconButton
                data-update-manifest={`${row.system}|${row.version}`}
                onClick={async () => setTargetedCsToUpdate(matchingCodeSystem)}
                buttoncontext="update"
              />
              <Tooltip
                title={`Update to version: ${matchingCodeSystem.version}`}
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
    <Box>
      {updateFn && (
        <Modal
          open={targetedCsToUpdate != null}
          onClose={() => setTargetedCsToUpdate(null)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={modalStyle}>
            <Typography variant="h6" component="h2">
              Confirm Update
            </Typography>
            <Typography sx={{ mt: 2, display: 'block' }} variant="body1">
              Do you want to upgrade to the latest version of <b>{getNameByUri(targetedCsToUpdate?.system!, allSystemNamesByUri)}</b> to
              version: <b>{targetedCsToUpdate?.version}</b>?
            </Typography>
            <Box sx={{ display: 'flex', mt: 3, flexDirection: 'row-reverse' }}>
              <MuiButton
                sx={{ ml: 2 }}
                onClick={() => {
                  updateFn(targetedCsToUpdate?.version, targetedCsToUpdate?.system)
                  setTargetedCsToUpdate(null)
                }}
              >
                Update
              </MuiButton>
              <MuiButton onClick={() => setTargetedCsToUpdate(null)}>Cancel</MuiButton>
            </Box>
          </Box>
        </Modal>
      )}

      {/* Filter Input */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Filter by Name, System, or Version..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          variant="outlined"
          sx={{ minWidth: '400px', maxWidth: '600px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: filterText && (
              <InputAdornment position="end">
                <Tooltip title="Clear filter">
                  <ClearIcon
                    sx={{ cursor: 'pointer', color: 'action.active' }}
                    onClick={() => setFilterText('')}
                  />
                </Tooltip>
              </InputAdornment>
            )
          }}
        />
        {filterText && (
          <Typography variant="body2" color="text.secondary">
            Showing {filteredData.length} of {preppedData.length} entries
          </Typography>
        )}
      </Box>

      <DataTable
        noDataComponent={<NoDataComponent isFiltered={!!filterText} />}
        columns={columns}
        customStyles={customTableStyles('readonly')}
        data={filteredData}
        pagination
        paginationPerPage={10}
        theme="aphl"
      />
    </Box>
  )
}

export default ManifestDetailTable
