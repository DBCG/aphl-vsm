import styled from 'styled-components'
import { FormControl } from '@mui/material'

// add grouper form + page elements
const Form = styled(FormControl)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 400px));
  gap: 12px;
  justify-content: center;
`

const FormTitle = styled.h1`
  color: var(--theme-500);
  margin-bottom: 24px;
  font-size: 24px;
  width: 100%;
`

const DirectionContainer = styled.div`
  display: flex;
  align-items: center;
`

const FormDirections = styled.div`
  color: var(--theme-500);
  font-size: 18px;
  margin-bottom: 48px;
  display: flex;
  align-items: center;
  margin-top: 64px;
`

const NumberItem = styled.div`
  min-width: 50px;
  min-height: 50px;
  background-color: white;
  color: var(--theme-500);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 150%;
  margin-right: 12px;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
`

const Row = styled.div`
  display: flex;
`

const MetadataContainer = styled.div`
  background-color: white;
  padding: 24px 36px;
  padding-bottom: 64px;
  display: flex;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 24px;
`

const Subtitle = styled.p`
  color: var(--theme-500);
`

const Asterisk = styled.span`
  color: var(--accent);
`

export { Form, FormDirections, FormTitle, DirectionContainer, Col, Row, MetadataContainer, NumberItem, Subtitle, Asterisk }
