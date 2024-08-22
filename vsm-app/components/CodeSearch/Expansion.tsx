import DT from 'react-data-table-component'
import { ExpanderComponentProps } from 'react-data-table-component'
import styled from 'styled-components'

interface ConditionItemWithId {
  id: string,
  valueCodeableConcept: fhir4.CodeableConcept
}
const getConditionTextFromItem = (conditionItem: ConditionItemWithId) => {
  return conditionItem?.valueCodeableConcept?.text
    || conditionItem?.valueCodeableConcept?.coding?.[0]?.display
    || `Code: ${conditionItem?.valueCodeableConcept?.coding?.[0]?.code}, System: ${conditionItem?.valueCodeableConcept?.coding?.[0]?.system}`
}

interface CodeData {
  code: string
  display: string
  system: string
  version: string
}

interface RowItems {
  leafDisplay: string
  groupersBelongsTo: string[]
  url: string
}


interface Row {
  groupsInProgram?: fhir4.ValueSet[]
  conditionsData?: ConditionsData
  data?: {
    codeData: CodeData
    leafData: {
      leafDisplay: string
      url: string
      groupersBelongsTo: string[]
      conditionInfo: string[]
    }[]
  }
}

const StyledChip = styled.div`
  border-radius: 8px;
  margin-bottom: 4px;
  padding: 4px 8px;
`

export type ConditionsData = Record<string, fhir4.CodeableConcept[]>

const Expansion = (props: Row) => {
  const { data, groupsInProgram, conditionsData } = props
  if(!data) return (<></>)

  const columns = [
    {
      name: 'Name',
      selector: (data: RowItems) => {
        return data.leafDisplay
      },
      cell: (data: RowItems) => <>{data.leafDisplay}</>
    },
    {
      name: 'Canonical',
      selector: (data: RowItems) => data.url,
      cell: (data: RowItems) => {
        return data.url
      }
    },
    {
      name: 'Grouper',
      selector: (data: RowItems) => data?.groupersBelongsTo?.join('') || data.url,
      cell: (data: RowItems) => {
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
      selector: (data: RowItems) => data.url,
      cell: (data: RowItems) => {
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
      <p>Match found in these Value Sets:</p>
      <DT
        // @ts-ignore
        columns={columns}
        data={data.leafData}
      />
    </div>
  )
}

export default Expansion