import styled from 'styled-components'
import { StatusProps } from '../Program/ProgramsTab'
import { IconChip } from '../data-display/Chips'

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
