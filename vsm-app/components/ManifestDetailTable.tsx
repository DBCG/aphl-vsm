import DataTable from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import { getNameByUri, namesByUri } from '@/pages/programs/[id]/manifest'
import { ManifestDataMap, ManifestSystemVersionPair } from '@/types/manifestTypes'

const prepData = (data: ManifestDataMap) => {
  if (!data) return []
  const preparedData: ManifestSystemVersionPair[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version }))
  })
  return preparedData
}

const ManifestDetailTable = ({ deleteFn = false, customStyles, data: manifestData, loading, programId }: any) => {
  const preppedData = prepData(manifestData)
  const { data: systemAndVersionData = [] } = useSWR(`/api/programs/${programId}/manifest`, fetcher, { revalidateOnFocus: false })

  const allSystemNamesByUri = namesByUri(systemAndVersionData)

  const columns = [
    {
      omit: !deleteFn,
      maxWidth: '50px',
      cell: (removeVersion: ManifestData) => {
        return (
          <IconButton
            onClick={() => deleteFn(removeVersion)}
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
      selector: (row: ManifestData) => getNameByUri(row.system!, allSystemNamesByUri),
      sortable: true,
      wrap: true,
      maxWidth: '200px'
    },
    {
      name: 'System',
      selector: (row: ManifestData) => row.system!,
      sortable: true,
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: ManifestData) => row.version!,
      sortable: true,
      wrap: true
    }
  ]

  return (
    <DataTable
      progressComponent={<LoadingIndicator />}
      progressPending={loading}
      columns={columns}
      highlightOnHover
      customStyles={customStyles}
      data={preppedData}
      pagination
      paginationPerPage={10}
    />
  )
}

export default ManifestDetailTable
