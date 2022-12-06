import styled from 'styled-components'
import { useRouter } from 'next/router'
import { BreadCrumbs } from './Breadcrumbs'
import { signOut, useSession } from 'next-auth/react'
import { Button } from './buttons/Button'
import { VSMSession } from '@/helpers/rolesHelper'

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
  const { data: session } = useSession() as unknown as { data: VSMSession}
  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs/>
        <Button text='Sign Out' onClick={() => {          
          signOut().then(() => {
            if (session?.idToken != null) {
              router.push(`${process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER}/protocol/openid-connect/logout?id_token_hint=${session.idToken}&post_logout_redirect_uri=${window.location.origin}`)
            }
          })
        }}/>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }