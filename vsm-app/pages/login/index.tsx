import styled from 'styled-components'

const Container = styled.div`
  background-color: rgba(255, 255, 255, 0.6);
  width: 800px;
  height: 500px;
  margin: 0 auto;
  padding: 60px;
`

const Title = styled.h1`
  text-align: center;
`

const LoginPage = () => {
  return (
    <Container>
      <Title>Sign In</Title>
    </Container>
  )
}

export default LoginPage