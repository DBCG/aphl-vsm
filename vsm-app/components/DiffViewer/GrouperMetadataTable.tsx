import { is } from '@/helpers/is'
import { Alert } from '@mui/material'
import styled from 'styled-components'
import DoNotTouchIcon from '@mui/icons-material/DoNotTouch'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { GrouperMetadata } from './DiffViewerTypes'

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
  padding-bottom: .2rem;
  border-bottom: 1px dashed lightgray;
`

const Td = styled.td`
  padding-bottom: .2rem;
  border-bottom: 1px dashed lightgray;
`

const formatRowTitle = (str: string) => str.split(/(?=[A-Z])/).join(' ')

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

const GrouperMetadataTable = ({ grouperTableData, id }: { grouperTableData: GrouperMetadata, id: string }) => {
  if (!grouperTableData) return null
  const rowKeys = Object.keys(grouperTableData)
    ?.filter(k => k !== 'isDeleted')
    ?.filter(k => k !== 'isNew')
    ?.filter(k => k !== 'hasChanges')

  const infoItem = () => {
    if (grouperTableData?.isDeleted) {
      return (
        <Alert icon={<DeleteForeverIcon/>} style={{ marginTop: '1rem', backgroundColor: 'var(--removed)'}} variant='filled' severity='error'>
          This grouper was deleted
        </Alert>
      )
    } else if (grouperTableData?.isNew) {
      return (
        <Alert icon={<AddCircleOutlineIcon/>} style={{ marginTop: '1rem', backgroundColor: 'var(--added)'}} variant='filled' severity='success'>
          This grouper was added
        </Alert>
      )
    } else if (!grouperTableData?.hasChanges) {
      return (
        <Alert icon={<DoNotTouchIcon/>} style={{ marginTop: '1rem', backgroundColor: 'var(--nochange)'}} variant='filled' severity='info'>
          This grouper has no changes to its value sets and code systems, but you can still view the contents
        </Alert> 
      )
    } else {
      return (
        <Alert style={{ marginTop: '1rem', backgroundColor: 'var(--caution)' }} severity='warning' variant='filled'>
          This grouper contains changes
        </Alert>  
      )
    }
  }
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
      {infoItem()}
      <h4 style={{ fontSize: '120%'}}>Grouper Metadata: <i>{grouperTableData.title || `ID: ${grouperTableData.id}`}</i></h4>
      <Container>
        <table>
          {rowKeys.map(k => (
            <tr key={k}>
              <Th key={k}>{formatRowTitle(k)}</Th>
              <Td key={k}>
                {produceStringForUI(
                  { itemForDisplay: grouperTableData[k as keyof GrouperMetadata],
                    placeholder: '[no data]'
                  }
                )}
              </Td>
            </tr>
          ))}
        </table>
      </Container>
    </div>
  )
}

export default GrouperMetadataTable