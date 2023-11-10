import styled from 'styled-components'

export const SelectInputContainer = styled.div`
  width: 100%;
  font-weight: 400;
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
  padding: 2em 1.8em;
  background-color: lightblue;
  width: 100%;
  font-weight: bold;
  color: var(--theme-500);
  column-gap: 24px;
  flex-wrap: wrap;
  gap: 2em;
`