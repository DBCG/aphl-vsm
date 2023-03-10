import DataTable from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'

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

const ManifestDetailTable = ({ deleteFn = false, data = {}, customStyles }: any) => {
  const preppedData = prepData(data)
  const columns = [
    {
      name: 'Delete',
      omit: !deleteFn,
      cell: (removeVersion: ManifestData) => {
        return <Button data-tag="allowRowEvents" text="Delete" onClick={() => deleteFn(removeVersion)} />
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
      name: 'Version',
      selector: (row: ManifestData) => row.version!,
      sortable: true,
      wrap: true
    }
  ]

  return <DataTable columns={columns} highlightOnHover customStyles={customStyles} data={preppedData} pagination paginationPerPage={10} />
}

export default ManifestDetailTable
