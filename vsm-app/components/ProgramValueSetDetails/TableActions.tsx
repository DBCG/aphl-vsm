import { Button } from '../buttons/Button'
import { TableRow } from '@/types/valuesets'
import styled from 'styled-components'

const TableActionContainer = styled.div`
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
  handleBulkEdit: () => void
  handleDelete: () => void
  isDeleting: boolean
  totalRows: number
}

const TableActions = ({ selectedRows, handleDelete, handleBulkEdit, isDeleting, totalRows }: TableActions) => {
  if (selectedRows?.length) {
    const text =
      selectedRows.length === totalRows
        ? `You have selected all ${totalRows} Valuesets in this Program`
        : `You have selected ${selectedRows.length} out of ${totalRows} total Valuesets`
    return (
      <TableActionContainer>
        <ActionContainerRow>
          <p>{text}</p>
        </ActionContainerRow>
        <ActionContainerRow>
          <Button
            style={{ backgroundColor: 'var(--accent)' }}
            text="Delete"
            loading={isDeleting}
            onClick={() => handleDelete()}
            data-action="delete"
          />
        </ActionContainerRow>
        <ActionContainerRow>
          <Button text="Bulk Edit" loading={isDeleting} onClick={() => handleBulkEdit()} data-action="bulk-edit" />
        </ActionContainerRow>
      </TableActionContainer>
    )
  } else {
    return null
  }
}

export default TableActions
