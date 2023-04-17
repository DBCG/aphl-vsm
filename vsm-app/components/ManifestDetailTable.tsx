import DataTable from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'
import { useGetProgramManifest } from '@/hooks/useGetProgramManifest'
import LoadingIndicator from './LoadingIndicator'

export interface ManifestData {
  system: string
  version: string
}

interface ManifestDataMap {
  [key: string]: string[]
}

const prepData = (data: ManifestDataMap) => {
  const preparedData: ManifestData[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version }))
  })
  return preparedData
}

const ManifestDetailTable = ({ deleteFn = false, customStyles, programId }: any) => {
  const { manifestData, manifestError, manifestLoading } = useGetProgramManifest({ programId })
  const preppedData = prepData(manifestData)
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
      name: 'System',
      selector: (row: ManifestData) => row.system!,
      sortable: true,
      wrap: true
    },
    {
      name: 'Versions',
      selector: (row: ManifestData) => row.version!,
      sortable: true,
      wrap: true
    }
  ]

  return (
    <DataTable
      progressComponent={<LoadingIndicator />}
      progressPending={manifestLoading}
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
