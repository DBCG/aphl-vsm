import styled from 'styled-components'
import Typography from '@mui/material/Typography'

const PageTitle = styled(Typography).attrs({
  variant: 'h3'
})`
  font-size: 2rem;
  color: var(--theme-300);
`

const PageP = styled(Typography).attrs({
  variant: 'body1'
})`
  color: var(--theme-300);
  display: inline-block;
`

const AccordionP = styled(Typography).attrs({
  variant: 'body1'
})`
  display: block;
  margin-bottom: .5rem;
  color: var(--theme-400);
  max-width: 40rem;
`

const AccordionHeading = styled(Typography).attrs({
  variant: 'body1'
})`
  display: block;
  color: var(--theme-400);
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: .3em;
`

const FormErrorText = styled(Typography).attrs({
  variant: 'body1'
})`
  color: var(--accent);
  font-size: 0.75rem;
  margin-left: 14px;
`


export { PageTitle, PageP, FormErrorText, AccordionP, AccordionHeading }
