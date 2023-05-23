/**
 * File for shared styles components
 */
import { PageTitle } from '@/components/Typography'
import styled from 'styled-components'

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

export const StyledSpan = styled.span`
  color: var(--theme-500);
  margin-top: 12px;
`

export const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

export const InputRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 12px;
`
export const Id = styled(PageTitle).attrs({
  as: 'span'
})`
  font-size: 20px;
`
export const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`

export const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 24px;
  background-color: white;
  gap: 16px 12px;
`

export const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
`
