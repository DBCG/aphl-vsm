import styled from 'styled-components'
import { StatusProps } from '../../pages/programs'

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  text-align: left;
  &.inputs {
    gap: 24px;
    margin-bottom: 16px;
  }
  &.readonly-inputs {
    flex-direction: column;
    justify-content: flex-start;
    column-gap: 8px;
    row-gap: 14px;
    margin-bottom: 12px;
  }
`

export const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

export const MetadataTitle = styled.div`
  display: flex;
  align-items: center;
`

export const StatusTag = styled.div<StatusProps>`
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 24px;
  height: fit-content;
  margin-left: 8px;
  font-size: 80%;
  color: ${(props) => (props.status === 'active' ? 'white' : '#ca9547')};
  font-weight: bold;
  text-transform: uppercase;
  background-color: ${(props) => (props.status === 'active' ? 'rgba(46, 192, 205, 1)' : 'white')};
`

export const ItemWrapper = styled.div`
  color: var(--theme-500);
  min-width: 300px;
`

export const FieldTitle = styled.div`
  background-color: white;
  display: inline-block;
  max-width: 120px;
  padding: 4px 8px;
  margin-right: 8px;
  border-radius: 4px;
`

export const StyledSpan = styled.span`
  color: var(--theme-500);
  margin-top: 12px;
`

export const ManifestContainer = styled.div`
  margin-bottom: 32px;
`

export const IndicatorContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding-top: 100px;
`

export const FieldValue = styled.span`
  white-space: pre-line;
`