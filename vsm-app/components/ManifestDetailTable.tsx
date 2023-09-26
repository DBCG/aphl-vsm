import DataTable from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { getNameByUri, namesByUri } from '@/pages/programs/[id]/manifest'
import { ManifestDataMap, ManifestSystemVersionPair } from '@/types/manifestTypes'
import { customTableStyles } from './tables/themes'

const prepData = (data: ManifestDataMap) => {
  if (!data) return []
  const preparedData: ManifestSystemVersionPair[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version, id: `${system}|${version}` }))
  })
  return preparedData
}

const ManifestDetailTable = ({ deleteFn = false, customStyles, data: manifestData, loading, programId, availableUpdates }: any) => {
  const preppedData = prepData(manifestData)
  const { data: systemAndVersionData = [] } = useSWR(`/api/programs/${programId}/manifest`, fetcher, { revalidateOnFocus: false })

  const allSystemNamesByUri = namesByUri(systemAndVersionData)

  const columns = [
    {
      omit: !deleteFn,
      maxWidth: '50px',
      cell: (row: ManifestSystemVersionPair) => {
        return (
          <IconButton
            data-delete-manifest={`${row.system}|${row.version}`}
            deletedItemDescription={`system "${row.system}" version ${row.version}`}
            onClick={() => deleteFn(row)}
            buttonContext="delete"
            style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
          />
        )
      },
      sortable: true,
      wrap: true
    },
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
    }
  ]
  console.log(availableUpdates)
  if (availableUpdates?.length > 0) {
    columns.push({
      name: 'Update Available',
      maxWidth: '200px',
      sortable: true,
      cell: (row: ManifestSystemVersionPair) => {
        const matchingVs = availableUpdates.find((vs) => vs.url === row.system && vs.version !== row.version)
        if (matchingVs) {
          return (
            <IconButton
              data-update-manifest={`${row.system}|${row.version}`}
              onClick={() => console.log('Updating manifest')}
              buttonContext="update"
              style={{ backgroundColor: 'darkGreen', margin: '0 auto' }}
            />
          )
        } else {
          return null
        }
      },
      wrap: true
    })
  }

  return (
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
  )
}

export default ManifestDetailTable
