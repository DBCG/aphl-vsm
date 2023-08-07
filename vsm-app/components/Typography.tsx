import styled from 'styled-components'
import Typography from '@mui/material/Typography'

const PageTitle = styled(Typography).attrs({
  variant: 'h3'
})`
  color: var(--theme-300);
`

const PageP = styled(Typography).attrs({
  variant: 'body1'
})`
  color: var(--theme-300);
`

const FormErrorText = styled(Typography).attrs({
  variant: 'body1'
})`
  color: var(--accent);
  font-size: 0.75rem;
  margin-left: 14px;
`


export { PageTitle, PageP, FormErrorText }
