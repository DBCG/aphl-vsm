import styled from 'styled-components'

interface ErrorState {
  message: string
  type: string
}

type Error = {
  error: string | string[] | null
  severity?: 'warning'
  style?: React.CSSProperties
}

const ErrorContainer = styled.div<Error>`
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

const ErrorText = styled.p<Error>`
  display: ${(props) => (props.error ? 'inherit' : 'none')};
  color: ${(props) => (props.severity === 'warning' ? 'black' : 'var(--accent)')};
  word-break: break-all;
  line-height: 1.5em;
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
  }
  return null
}

const ErrorMessage = ({ error, severity, style }: Error) => {
  return (
    <ErrorContainer style={{...style}} severity={severity} error={error}>
      <ErrorContent severity={severity} error={error} />
    </ErrorContainer>
  )
}

export type { ErrorState }
export { ErrorMessage }
