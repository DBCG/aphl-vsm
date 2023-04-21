import DataTable, { TableStyles } from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import { NameRecord } from '@/pages/programs/[id]/manifest'

export interface ManifestData {
  system: string
  version: string
}

interface ManifestDataMap {
  [key: string]: string[]
}

const prepData = (data: ManifestDataMap) => {
  if (!data) return []
  const preparedData: ManifestData[] = []
  Object.entries(data).forEach(([system, value]) => {
    value?.forEach((version) => preparedData.push({ system, version }))
  })
  return preparedData
}

interface Props {
  deleteFn: (arg0: ManifestData) => void
  customStyles: TableStyles
  data: ManifestDataMap
  loading: boolean
  memoizedNames: NameRecord
}

const ManifestDetailTable = ({ deleteFn, customStyles, data: manifestData, loading, memoizedNames }: Props) => {
  const preppedData = prepData(manifestData)
  const columns = [
    {
      name: 'Name',
      maxWidth: '200px',
      selector: (row: ManifestData) => memoizedNames[row.system!],
      sortable: true,
      wrap: true
    },
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
