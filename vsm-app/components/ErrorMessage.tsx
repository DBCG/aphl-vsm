import styled from 'styled-components'

interface ErrorState {
  message: string
  type: string
}

type Error = {
  error: string | null
}

const ErrorContainer = styled.div<Error>`
  max-height: ${props => props.error ? '500px' : '0'};
  background-color: white;
  transition: max-height 1s ease;
  padding-left: 18px;
  border: ${props => props.error ? '1px solid var(--accent)' : 'none'}; 
`

const ErrorText = styled.p<Error>`
  color: var(--accent);
  display: ${props => props.error ? 'inherit' : 'none'};
`

const ErrorMessage = ({ error }: Error) => {
  return (
    <ErrorContainer error={error}>
      <ErrorText error={error}>{ error }</ErrorText>
    </ErrorContainer>
  )
}

export type { ErrorState }
export { ErrorMessage }
