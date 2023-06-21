import styled from 'styled-components'
import { FormControl } from '@mui/material'

export const Form = styled(FormControl)`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 32px;
  padding: 16px;
  padding-bottom: 24px;
  background-color: var(--theme-100);
`

export const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  flex-basis: 100%;
  gap: 12px;
`

export const TextAreaRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: 16px 12px;
`

export const Col = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`

export const RequiredWarning = styled.p`
  color: red;
  font-style: italic;
  margin-top: 0;
  text-align: right;
`

export const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`

export const buttonStyles = {
  width: '150px',
  backgroundColor: 'var(--theme-300)',
  marginTop: '20px'
}
