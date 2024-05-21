import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-wrap: nowrap;
  text-align: left;
  background-color: white;
`

const Th = styled.th`
  padding-right: 1.4rem;
  text-transform: capitalize;
`

type DataItem = [string | undefined, string | undefined]

interface TableData {
  id: DataItem
  name: DataItem
  version: DataItem
  purpose: DataItem
  effectiveStart: DataItem
  releaseDate: DataItem
}

const formatRowTitle = (str) => str.split(/(?=[A-Z])/).join(' ')

const GrouperMetadataTable = ({ grouperTableData }: { grouperTableData: TableData }) => {
  if (!grouperTableData) return null
  const rowKeys = Object.keys(grouperTableData)
  return (
    <Container>
      <table>
        {rowKeys.map(k => (
          <tr>
            <Th key={k}>{formatRowTitle(k)}</Th>
            <td key={k}>{grouperTableData[k] || '[no data]'}</td>
          </tr>
        ))}
      </table>
    </Container>
  )
}

export default GrouperMetadataTable