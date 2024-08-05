import { is } from '@/helpers/is'
import { Alert } from '@mui/material'
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
  isDeleted: boolean
  isNew: boolean
  hasChanges: boolean
}

const formatRowTitle = (str) => str.split(/(?=[A-Z])/).join(' ')

interface StringForUI {
  itemForDisplay: any
  placeholder: string
}


const produceStringForUI = ({ itemForDisplay, placeholder='' }: StringForUI): string => {
  if (typeof itemForDisplay === 'string') {
    return itemForDisplay
  } else if (is.stringArray(itemForDisplay)) {
    return itemForDisplay.join(', ')
  }
    return placeholder
}

const GrouperMetadataTable = ({ grouperTableData, id }: { grouperTableData: TableData }) => {
  if (!grouperTableData) return null
  const rowKeys = Object.keys(grouperTableData)
    ?.filter(k => k !== 'isDeleted')
    ?.filter(k => k !== 'isNew')
    ?.filter(k => k !== 'hasChanges')

  console.log('grouperTableData: ', grouperTableData)
  return (
    <div
      id={id}
      style={{
        background: 'white',
        padding: '0px 16px',
        borderTop: '1px solid rgba(0,0,0,.12)',
        fontSize: '90%',
        width: '100%'
      }}
    >
      {grouperTableData?.isDeleted && (
      <Alert style={{ marginTop: '1rem'}} variant='filled' severity='error'>
        This grouper was deleted
      </Alert>
      )}
      {grouperTableData?.isNew && (
      <Alert style={{ marginTop: '1rem'}} variant='filled' severity='success'>
        This grouper was added
      </Alert>
      )}
      {!grouperTableData?.hasChanges && (
      <Alert style={{ marginTop: '1rem'}} variant='filled' severity='info'>
        This grouper has no changes to its value sets and code systems, but you can still view the contents
      </Alert>
      )}
      <h4>Grouper Metadata: <i>{`ID ${grouperTableData.id}`}</i></h4>
      <Container>
        <table>
          {rowKeys.map(k => (
            <tr>
              <Th key={k}>{formatRowTitle(k)}</Th>
              <td key={k}>
                {produceStringForUI(
                  { itemForDisplay: grouperTableData[k],
                    placeholder: '[no data]'
                  }
                )}
              </td>
            </tr>
          ))}
        </table>
      </Container>
    </div>
  )
}

export default GrouperMetadataTable