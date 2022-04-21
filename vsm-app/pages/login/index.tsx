import styled from 'styled-components'
import { useState } from 'react'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/buttons/Button'
import { useRouter } from 'next/router'

const Container = styled.div`
  background-color: rgba(255, 255, 255, 0.6);
  width: 800px;
  height: 500px;
  margin: 0 auto;
  padding: 60px;
`

const Title = styled.h1`
  text-align: center;
  font-size: 38px;
  color: var(--theme-500);
`

const InputContainer = styled.div`
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0 auto;
`

const LoginPage = () => {
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const router = useRouter()
  
  const handleSubmit = () => {
    router.push('/')
  }

  return (
    <Container>
      <Title>Sign In</Title>
      <InputContainer>
        <SearchInput
          label='Email address'
          id='email'
        />
        <SearchInput
          label='Password'
          id='address'
        />
        <Button
          style={{ marginTop: '16px' }}
          text='SUBMIT'
          onClick={handleSubmit}
        />
      </InputContainer>
    </Container>
  )
}

export default LoginPage