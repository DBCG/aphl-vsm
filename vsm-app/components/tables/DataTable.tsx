import DT, { TableColumn } from 'react-data-table-component'
import LoadingIndicator from '../LoadingIndicator'

interface DataTProps {
  programs: fhir4.Library[]
  columns: TableColumn<fhir4.Library>[]
}
const DataTable = ({ programs, columns }: DataTProps) => {
  return <DT data={programs} columns={columns} />
}

export { DataTable }
