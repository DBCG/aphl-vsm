import styled from 'styled-components'
import { useRouter } from 'next/router'
import { signOut } from 'next-auth/react'
import { BreadCrumbs } from './Breadcrumbs'
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
  const router = useRouter()

  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs/>
        <Button text='Sign Out' onClick={() => {          
          signOut({ redirect: false })
          router.push('/api/auth/logout')
        }}/>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }