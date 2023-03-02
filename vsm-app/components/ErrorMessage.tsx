import styled from 'styled-components'

interface ErrorProp {
  error: string
}

const ErrorContainer = styled.div<ErrorProp>`
  max-height: ${props => props.error ? '500px' : '0'};
  background-color: white;
  transition: max-height 1s ease;
  padding-left: 18px;
  border: ${props => props.error ? '1px solid var(--accent)' : 'none'}; 
`

const ErrorText = styled.p<ErrorProp>`
  color: var(--accent);
  display: ${props => props.error ? 'inherit' : 'none'};
`

const ErrorMessage = (error: string) => {
  <ErrorContainer error={error}>
    <ErrorText error={error}>{ error }</ErrorText>
  </ErrorContainer>
}

export { ErrorMessage }
