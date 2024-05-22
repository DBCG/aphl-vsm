
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

const ProgramMetadataTable = ({ rootLibData }: { grouperTableData: TableData }) => {
  if (!rootLibData) return null
  console.log('root lib dta: ', rootLibData)
  const rowKeys = Object?.keys(rootLibData)

  const items = rowKeys.map(k => {
    const styles = (ind: number) => {
      if(!rootLibData[k][ind]) {
        return ({
          color: 'lightgray'
        })
      }
      return ({})
    }
    return (
    <tr>
      <Th key={k}>{formatRowTitle(k)}</Th>
      <td style={styles(0)} key={k+0}>{rootLibData[k][0] || '[no data]'}</td>
      <td style={styles(1)} key={k+1}>{rootLibData[k][1] || '[no data]'}</td>
    </tr>
  )})
  return (
    <div style={{
      background: 'white',
      padding: '0px 16px',
      borderTop: '1px solid rgba(0,0,0,.12)'
    }}>
    <h4>Comparing Programs:</h4>
      <Container>
        <table>
        <tr style={{ fontWeight: 'bold' }}>
          <Th></Th>
          <td>Base Program</td>
          <td>Comparison Program</td>
        </tr>
          {items}
        </table>
      </Container>
    </div>
  )
}

export default ProgramMetadataTable