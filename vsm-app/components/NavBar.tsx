import styled from 'styled-components'
import { signOut } from 'next-auth/react'
import { Button } from './buttons/Button'

const BarWrapper = styled.nav`
  margin-bottom: 24px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  min-height: 60px;
  width: 100%;
`

const Bar = styled.ol`
  list-style-type: none;
  margin: 0;
  padding: 15px;
  justify-content: flex-end;
  display: flex;
  flex: 1;
  width: 100%;
  column-gap: 24px;
`

const NavBar = () => {
  return (
    <BarWrapper>
      <Bar>
        <Button text='Sign Out' onClick={() => signOut()}/>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }