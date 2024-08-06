
import styled from 'styled-components'
import { RootLibrary } from './DiffViewerTypes'

const Container = styled.div`
  display: flex;
  flex-wrap: nowrap;
  text-align: left;
  background-color: white;
  margin-bottom: 2rem;
  padding: 24px 16px;
  font-size: 90%;
`

const Th = styled.th`
  padding-right: 1.4rem;
  text-transform: capitalize;
`

const Td = styled.td`
  padding-right: 1rem;
  padding-bottom: .2rem;
  border-bottom: 1px dashed lightgray;
`

const Tr = styled.tr`
  border: 1px solid !important;
`

export const FlexTableTitle = styled.h4`
  font-weight: 100;
`

export const VerticalRowTitle = styled.tr`
  font-weight: 600;
`

type TableData = Record<string, (string|undefined)[]>


const formatRowTitle = (str: string) => str.split(/(?=[A-Z])/).join(' ')

const ProgramMetadataTable = ({ rootLibData }: {rootLibData: RootLibrary }) => {
  if (!rootLibData) return null
  const rowKeys = Object?.keys(rootLibData)

  const items = rowKeys.map(k => {
    const styles = (ind: number) => {
      // if there is no data for the program comparison, color the cell light gray
      if(!rootLibData?.[k as keyof RootLibrary]?.[ind]) {
        return ({
          color: 'lightgray'
        })
      }
      return ({})
    }
    return (
    <Tr key={k}>
      <Th key={k}>{formatRowTitle(k)}</Th>
      <Td style={styles(0)} key={k+0}>{rootLibData?.[k as keyof RootLibrary]?.[0] || '[no data]'}</Td>
      <Td style={styles(0)} key={k+0}></Td>
      <Td style={styles(1)} key={k+1}>{rootLibData?.[k as keyof RootLibrary]?.[1] || '[no data]'}</Td>
    </Tr>
  )})
  return (
    <div
      id='program-metadata'
      style={{
        background: 'white',
        padding: '0px 16px',
        borderTop: '1px solid rgba(0,0,0,.12)'
      }}
    >
    <FlexTableTitle>Comparing Programs:</FlexTableTitle>
      <Container>
        <table>
          <VerticalRowTitle>
            <Th></Th>
            <Td>Base Program</Td>
            <Td>→</Td>
            <Td>Comparison Program</Td>
          </VerticalRowTitle>
          {items}
        </table>
      </Container>
    </div>
  )
}

export default ProgramMetadataTable