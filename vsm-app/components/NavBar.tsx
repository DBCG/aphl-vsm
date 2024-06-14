import styled from 'styled-components'
import { useRouter } from 'next/router'
import { signOut } from 'next-auth/react'
import { BreadCrumbs } from './navigation/Breadcrumbs'
import { Button } from './buttons/Button'
import { createContext, useState, useContext, ReactNode } from 'react'
import packageInfo from '@/package.json'
import Box from '@mui/material/Box'
import { Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'

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

interface NavContextType {
  isGrouperView: boolean
  changeGrouperView: Function
}

// create toggle context
export const NavContext = createContext({
  isGrouperView: false,
  changeGrouperView: () => {}
} as NavContextType)

interface Props {
  children: ReactNode
}

// create context provider
export const NavContextProvider: React.FC<Props> = ({ children }) => {
  const [isGrouperView, setIsGrouperView] = useState(false)

  const changeGrouperView = (value: boolean) => {
    setIsGrouperView(value)
  }
  return <NavContext.Provider value={{ isGrouperView, changeGrouperView }}>{children}</NavContext.Provider>
}

const NavBar = () => {
  const router = useRouter()
  const { isGrouperView } = useContext(NavContext)

  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs isGrouperView={isGrouperView} />
        <Box sx={{ alignItems: 'center', display: 'flex' }}>
          <Tooltip title={`App Version v-${packageInfo.version}`}>
            <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
          </Tooltip>
          <Button
            text="Sign Out"
            id="logout"
            onClick={() => {
              signOut({ redirect: false })
              router.push('/api/auth/logout')
            }}
          />
          <Button
            text="Admin Tools"
            id="admin"
            onClick={() => {
              signOut({ redirect: false })
              router.push('/admin')
            }}
          />
        </Box>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }
