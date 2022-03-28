import DT from 'react-data-table-component'

const DataTable = ({ programs, columns }) =>  {
  return (
    <DT
      data={programs}
      columns={columns}
    />
  )
}

export { DataTable }

