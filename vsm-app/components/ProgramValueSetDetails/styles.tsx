import styled from 'styled-components'
import { Button } from '../buttons/Button'
import { TableRow } from '@/types/valuesets'

export const SelectInputContainer = styled.div`
  width: 100%;
`

export const SelectInputTitle = styled.p`
  padding-bottom: 8px;
  margin: 0;
  margin-right: 12px;
`

export const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

export const ReadOnlyContainer = styled.div`
  display: flex;
  flex: 1;
  gap: 6px;
  flex-wrap: wrap;
`

export const ReadOnlyTag = styled.div`
  background-color: var(--theme-color-transparent);
  padding: 6px 8px;
  border-radius: 8px;
`

export const LoadingMessage = styled.p`
  color: blue;
`

export const TableActionContainer = styled.div`
  display: flex;
  border: 4px solid var(--theme-300);
  padding: 4px 16px;
  background-color: lightblue;
  width: 100%;
  font-weight: bold;
  color: var(--theme-500);
  column-gap: 24px;
`

const ActionContainerRow = styled.div`
  display: flex;
  align-items: center;
`

interface TableActions {
  selectedRows: TableRow[]
  handleDelete: (selectedRows: TableRow[]) => void
  isDeleting: boolean
}

export const TableActions = ({
  selectedRows,
  handleDelete,
  isDeleting
}: TableActions) => {
  if (selectedRows?.length) {

    return (
      <TableActionContainer>
        <ActionContainerRow>
          <p>{selectedRows.length} valueset{selectedRows.length > 1 && 's'} selected</p>
        </ActionContainerRow>
        <ActionContainerRow>
          <Button
            style={{ backgroundColor: 'var(--accent)' }}
            text='Delete'
            loading={isDeleting}
            onClick={() => handleDelete(selectedRows)}
          />
        </ActionContainerRow>
      </TableActionContainer>
    )
  } else {
    return null
  }
}
