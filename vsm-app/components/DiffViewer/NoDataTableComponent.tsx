import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 2rem;
`

const NoDataTableComponent = ({ resourceType }: { resourceType: 'code' | 'valueset' }) => {
  return (
    <Container>
      <p>{`No ${resourceType === 'code' ? 'Codes' : 'ValueSets'} were changed between selected program versions`}</p>
    </Container>
  )
}

export { NoDataTableComponent }