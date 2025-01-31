import styled from 'styled-components'
import { SubmitProps } from './types'

export const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

export const ErrorText = styled.span`
  color: darkRed;
  font-size: 90%;
  margin-left: 0;
`

export const SelectInputContainer = styled.div`
  min-width: 300px;
`

export const ErrorBlock = styled.div`
  background-color: white;
  border-left: 2px solid red;
  border-bottom: 2px solid red;
  padding: 4px 6px;
  margin-top: 12px;
  position: relative;
`

export const GroupsRequired = styled.i`
  color: var(--accent);
  font-size: 80%;
`

export const ErrorBlockText = styled.p`
  margin-top: 0;
  margin-bottom: 8px;
  &:last-of-type {
    margin-bottom: 0;
  }
`
export const NoData = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1em 2em 2em;
`

export const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

export const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  column-gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

export const StyledForm = styled.form`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  column-gap: 12px;
  row-gap: 15px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

export const CopyButton = styled.button`
  background-color: transparent;
  position: absolute;
  top: 4px;
  right: 6px;
  padding: 0px 6px 4px 6px;
`

export const TextAreaSubmitContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 38.5rem;
`

export const DropdownContainer = styled.div`
  align-self: flex-start;
`

export const SelectGrouperContainer = styled.div`
  display: ${(props) => (props.hidden ? 'none' : 'block')};
`

export const SubmitSelectedForm = styled.form<SubmitProps>`
  padding: 12px 18px;
  background-color: var(--theme-100);
  max-height: ${(props) => (props.hide ? '0' : '1000px')};
  padding: ${(props) => (props.hide ? '0' : 'auto')};
  transition: all 0.3s;
`