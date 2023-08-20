import styled from 'styled-components'

interface ErrorState {
  message: string
  type: string
}

type Error = {
  error: string | null
  severity?: 'warning'
  style?: React.CSSProperties
}

const ErrorContainer = styled.div<Error>`
  max-height: ${(props) => (props.error ? '500px' : '0')};
  background-color: ${(props) => (props.severity === 'warning' ? 'var(--warning-light)' : 'white')};
  transition: max-height 1s ease;
  padding-left: 18px;
  border: ${(props) => {
    if(props?.severity === 'warning' && props?.error) {
      return '1px solid orange';
    } else if (props?.error) {
      return '1px solid var(--accent)';
    } else {
      return 'none';
    }
  }}
`

const ErrorText = styled.p<Error>`
  color: var(--accent);
  display: ${(props) => (props.error ? 'inherit' : 'none')};
  color: ${(props) => (props.severity === 'warning' ? 'black' : 'var(--accent)')};
`

const ErrorMessage = ({ error, severity, style }: Error) => {
  return (
    <ErrorContainer severity={severity} error={error} style={style}>
      <ErrorText severity={severity} error={error}>{error}</ErrorText>
    </ErrorContainer>
  )
}

export type { ErrorState }
export { ErrorMessage }
