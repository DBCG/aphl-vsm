import styled from 'styled-components'
import Breadcrumbs from 'nextjs-breadcrumbs'
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
  justify-content: space-between;
  display: flex;
  flex: 1;
  width: 100%;
  column-gap: 24px;
`

const NavBar = () => {
  return (
    <BarWrapper>
      <Bar>
      <Breadcrumbs
        useDefaultStyle
        omitRootLabel
        activeItemClassName='active-crumb'
        inactiveItemClassName='inactive-crumb'
        transformLabel={(title) => title.charAt(0).toUpperCase() + title.slice(1)}
        activeItemStyle={{
          backgroundColor: 'red !important'
        }}
      />
        <Button text='Sign Out' onClick={() => signOut()}/>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }