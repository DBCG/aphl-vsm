import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-wrap: nowrap;
  text-align: left;
  background-color: white;
  margin-bottom: 2rem;
  padding: 24px 16px;
  border-bottom: 1px solid rgba(0,0,0,.12);
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
  console.log('grouper table dta: ', grouperTableData)
  const rowKeys = Object.keys(grouperTableData)
  return (
    <div style={{
      background: 'white',
      padding: '0px 16px',
      borderTop: '1px solid rgba(0,0,0,.12)'
    }}>
    <h4>Grouper Metadata: <i>{`ID ${grouperTableData.id}`}</i></h4>
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
    </div>
  )
}

export default GrouperMetadataTable