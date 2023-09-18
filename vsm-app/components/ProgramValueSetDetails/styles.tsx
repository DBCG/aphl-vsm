import styled from 'styled-components'
import { Button } from '../buttons/Button'

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
  border: 4px solid blue;
  padding: 24px 36px;
  background-color: lightblue;
  width: 100%;
`

const ActionContainerRow = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
`

export const TableActions = ({ selectedRows, handleDelete, isDeleting }) => {
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
