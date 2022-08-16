import styled from 'styled-components'
import { BreadCrumbs } from './Breadcrumbs'
import { signOut } from 'next-auth/react'
import { Button } from './buttons/Button'

const BarWrapper = styled.div`
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
  justify-content: space-between;
  display: flex;
  flex: 1;
  width: 100%;
  column-gap: 24px;
  a {
    color: var(--theme-500) !important;
    font-weight: semibold;
    font-size: 110%;
  }
`

const NavBar = () => {
  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs/>
        <Button text='Sign Out' onClick={() => signOut()}/>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }