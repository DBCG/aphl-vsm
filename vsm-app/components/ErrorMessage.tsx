import styled from 'styled-components'
import { Alert } from '@mui/material'
import cloneDeep from 'lodash.clonedeep'

interface ErrorState {
  message: string
  type: string
}

type Error = {
  error: string | string[] | null
  severity?: 'warning'
  handleClose?: () => void
  style?: React.CSSProperties
}

export const ErrorContainer = styled.div<Error>`
  max-height: ${(props) => (props.error ? '500px' : '0')};
  background-color: ${(props) => (props.severity === 'warning' ? 'var(--warning-light)' : 'white')};
  transition: max-height 1s ease;
  padding: .25em 1em;
  border: ${(props) => {
    if (props?.severity === 'warning' && props?.error) {
      return '1px solid orange'
    } else if (props?.error) {
      return '1px solid var(--accent)'
    } else {
      return 'none'
    }
  }};
`

export const ErrorText = styled.p<Error>`
  display: ${(props) => (props.error ? 'inherit' : 'none')};
  color: ${(props) => (props.severity === 'warning' ? 'black' : 'var(--accent)')};
  word-break: break-all;
  line-height: 1.5em;
  max-width: 100ch;
`

const ErrorContent = ({ error, severity }: Error) => {
  if (typeof error === 'string') {
    return (
      <ErrorText severity={severity} error={error}>
        {error}
      </ErrorText>
    )
  } else if (Array.isArray(error)) {
    const lines = error.map((e, index) => (
      <ErrorText severity={severity} error={e} key={index}>
        {e}
      </ErrorText>
    ))

    return <>{lines}</>
  } else if (error && typeof error === 'object') {
    const clonedErrors = cloneDeep(error)
    let errorCategories = Object.keys(error)
    errorCategories.forEach(category => {
      if (!error[category]?.length) {
        delete clonedErrors[category]
      }
    })

    // if there are no errors at all, return null
    if (!Object.keys(clonedErrors).length) return null

    errorCategories = Object.keys(clonedErrors)
  
    const itemsForDisplay = {} as Record<string, React.ReactElement | React.ReactElement[]>

    errorCategories.forEach(cat => {
      if (typeof error[cat] === 'string') {
        itemsForDisplay[cat] = (
          <ErrorText severity={severity} error={error[cat]} key={0}>
            {error[cat]}
          </ErrorText>
        )
      } else if (Array.isArray(error[cat])) {
        const listItems = error[cat].map((e, ind) => (
          <ErrorText severity={severity} error={e} key={ind}>
            {e}
          </ErrorText>
        ))
        itemsForDisplay[cat] = listItems
      }
    })

    return Object.keys(itemsForDisplay).map(title => (
        <>
          <p style={{ marginTop: 0 }}>{title}</p>
          {itemsForDisplay[title]}
        </>
    ))
  }
  return null
}

const ErrorMessage = ({ error, severity, handleClose, style }: Error) => {
  return (
      <Alert variant='outlined' severity='error' sx={{ bgcolor: 'background.paper' }} onClose={handleClose} style={style}>
        <ErrorContent severity={severity} error={error} />
      </Alert>
  )
}

export type { ErrorState }
export { ErrorMessage }
