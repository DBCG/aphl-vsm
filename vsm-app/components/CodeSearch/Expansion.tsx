import DT from 'react-data-table-component'
import { ExpanderComponentProps } from 'react-data-table-component'
import styled from 'styled-components'

const getConditionTextFromItem = (conditionItem) => {
  return conditionItem?.valueCodeableConcept?.text
    || conditionItem?.valueCodeableConcept?.coding?.[0]?.display
    || `Code: ${conditionItem?.valueCodeableConcept?.coding?.[0]?.code}, System: ${conditionItem?.valueCodeableConcept?.coding?.[0]?.system}`
}

interface Row {
  leafData: {
    leafDisplay: string
    url: string
    groupersBelongsTo: string[]
    conditionInfo: string[]
  }
}

const StyledChip = styled.div`
  border-radius: 8px;
  margin-bottom: 4px;
  padding: 4px 8px;
`

export type ConditionsData = Record<string, fhir4.CodeableConcept[]>

interface Props extends ExpanderComponentProps<Row> {
  // currently, props that extend ExpanderComponentProps must be set to optional.
  // https://react-data-table-component.netlify.app/?path=/docs/expandable-basic--basic
  groupsInProgram?: fhir4.ValueSet[]
  conditionsData?: ConditionsData
}

const Expansion = (props: Props) => {
  console.log('props: ', props)
  const { data, groupsInProgram, conditionsData } = props

  if(!data) return (<></>)

  const columns = [
    {
      name: 'Name',
      selector: (data: Row) => {
        return data.leafDisplay
      },
      cell: (data: Row) => <>{data.leafDisplay}</>
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
              <StyledChip style={{ backgroundColor: 'var(--theme-100)'}} key={noSpacesTitle}>{vs?.title}</StyledChip>
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
        const condData = conditionsData?.[data.url] || []
        const conditionMatches = condData
          ?.map((conditionItem: any) => {
            const conditionKey = conditionItem.id
            return (
              <StyledChip style={{backgroundColor: 'var(--light-callout)'}} key={conditionKey}>{getConditionTextFromItem(conditionItem)}</StyledChip>
            )
        }) || null
        return (
          <div>
            {conditionMatches}
          </div>
        )
      }
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <p>Match found in these Valuesets</p>
      <DT
        columns={columns}
        data={data.leafData}
      />
    </div>
  )
}

export default Expansion