import styled from 'styled-components'
import { StyledLabel } from '@/components/InputLabel'

export const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
`

export const SubtitleRow = styled(Row)`
  margin-bottom: 8px;
`

export const LabelStyled = styled(StyledLabel)`
  margin-bottom: 0;
`

export const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
  gap: 8px;
`

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin-bottom: 48px;
`