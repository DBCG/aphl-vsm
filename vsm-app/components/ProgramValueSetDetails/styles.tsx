import styled from 'styled-components'

export const customStyles = {
  headCells: {
    style: {
      padding: '16px',
      overflow: 'visible'
    }
  },
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px',
      whiteSpace: 'normal !important',
      overflow: 'visible'
    }
  },
  rows: {
    style: {
      cursor: 'pointer'
    },
    highlightOnHoverStyle: {
      backgroundColor: '#DBF0F3'
    }
  }
}

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
