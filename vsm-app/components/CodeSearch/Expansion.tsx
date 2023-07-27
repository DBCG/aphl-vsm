import DT from 'react-data-table-component'
import { ExpanderComponentProps } from 'react-data-table-component'

interface Row {
  leafDisplay: string
  url: string
  groupersBelongsTo: string[]
}

interface Props extends ExpanderComponentProps<Row> {
  groupsInProgram: fhir4.ValueSet[]
}

const Expansion = ({ data, groupsInProgram }: Props) => {
  if(!data) return (<></>)
  const columns = [
    {
      name: 'Name',
      selector: (data: Row) => data.leafDisplay
    },
    {
      name: 'Canonical',
      selector: (data: Row) => data.url
    },
    {
      name: 'In Groupers',
      selector: (data: Row) => data.groupersBelongsTo.join(''),
      cell: (data: Row) => {
        const grouperMatches = groupsInProgram
          ?.filter((grouper => data.groupersBelongsTo.includes(grouper.id!)))
          ?.map(vs => <div>{vs?.title?.replace('_', ' ')}</div>)

        return (
          <div>{grouperMatches}</div>
        )
      }
    },
    {
      name: 'Associated Conditions',
      selector: (data: Row) => data.leafDisplay
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <p>Match found in these Valuesets</p>
      <DT
        columns={columns}
        data={[data]}
      />
    </div>
  )
}

export default Expansion