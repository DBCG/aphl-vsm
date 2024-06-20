
import styled from 'styled-components'
import { MenuDedent } from './FlexibleMenu/images/MenuDedent'

const Container = styled.div`
  display: flex;
  flex-wrap: nowrap;
  text-align: left;
  background-color: white;
  margin-bottom: 2rem;
  padding: 24px 16px;
`

const Th = styled.th`
  padding-right: 1.4rem;
  text-transform: capitalize;
`

const Td = styled.td`
  padding-right: .4rem;
`

const Tr = styled.tr`
  border: 1px solid !important;
`

export const FlexTableTitle = styled.h4`
  font-weight: 100;
`

export const VerticalRowTitle = styled.tr`
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
    <Tr>
      <Th key={k}>{formatRowTitle(k)}</Th>
      <Td style={styles(0)} key={k+0}>{rootLibData[k][0] || '[no data]'}</Td>
      <Td style={styles(1)} key={k+1}>{rootLibData[k][1] || '[no data]'}</Td>
    </Tr>
  )})
  return (
    <div style={{
      background: 'white',
      padding: '0px 16px',
      borderTop: '1px solid rgba(0,0,0,.12)'
    }}>
    <FlexTableTitle>Comparing Programs:</FlexTableTitle>
      <Container>
        <table>
          <VerticalRowTitle>
            <Th></Th>
            <Td>Base Program</Td>
            <Td>Comparison Program</Td>
          </VerticalRowTitle>
          {items}
        </table>
      </Container>
    </div>
  )
}

export default ProgramMetadataTable