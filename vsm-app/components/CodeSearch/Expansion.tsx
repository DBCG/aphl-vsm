import DT from 'react-data-table-component'
import { ExpanderComponentProps } from 'react-data-table-component'

interface Row {
  leafDisplay: string
  url: string
  groupersBelongsTo: string[]
  conditionInfo: string[]
}

interface Props extends ExpanderComponentProps<Row> {
  // currently, props that extend ExpanderComponentProps must be set to optional.
  // https://react-data-table-component.netlify.app/?path=/docs/expandable-basic--basic
  groupsInProgram?: fhir4.ValueSet[]
}

const Expansion = (props: Props) => {
  const { data, groupsInProgram } = props

  if(!data) return (<></>)

  const columns = [
    {
      name: 'Name',
      selector: (data: Row) => data.leafDisplay
    },
    {
      name: 'Canonical',
      selector: (data: Row) => data.url,
      cell: (data: Row) => {
        return data.url
      }
    },
    {
      name: 'Grouper',
      selector: (data: Row) => data?.groupersBelongsTo?.join('') || data.url,
      cell: (data: Row) => {
        const grouperMatches = groupsInProgram
          ?.filter((grouper => data.groupersBelongsTo.includes(grouper.id!)))
          ?.map((vs) => {
            const noSpacesTitle = vs?.title?.replace(' ', '') 
            return (
              <div style={{ borderRadius: '8px', backgroundColor: 'var(--theme-100)', marginBottom: '4px', padding: '4px 8px' }} key={noSpacesTitle}>{vs?.title}</div>
            )
          })

        return (
          <div style={{ margin: '1em 0'}}>{grouperMatches}</div>
        )
      }
    },
    {
      name: 'Associated Conditions',
      selector: (data: Row) => data?.conditionInfo?.join('') || data.url,
      cell: (data: Row) => {
        const conditionMatches = data.conditionInfo
          ?.map(condition => <div key={condition}>{condition}</div>)

        return (
          <div>{conditionMatches}</div>
        )
      }
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