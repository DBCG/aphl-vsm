import styled from 'styled-components'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { BreadCrumbs } from './navigation/Breadcrumbs'
import { createContext, useState, useContext, ReactNode } from 'react'
import packageInfo from '@/package.json'
import Box from '@mui/material/Box'
import InfoIcon from '@mui/icons-material/Info'
import { VSMSession } from '@/helpers/rolesHelper'
import { Divider, IconButton, ListItemIcon, Button, Menu, MenuItem, Tooltip } from '@mui/material'
import { Logout, MoreVert, AdminPanelSettings, Settings, House } from '@mui/icons-material'

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const router = useRouter()
  const { isGrouperView } = useContext(NavContext)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs isGrouperView={isGrouperView} />
        <Box sx={{ alignItems: 'center', display: 'flex' }}>
          <Tooltip title={`App Version v-${packageInfo.version}`}>
            <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
          </Tooltip>
          <Button
            id="logout"
            onClick={() => {
              signOut({ redirect: false })
              router.push('/api/auth/logout')
            }}
          >
            Sign Out
          </Button>
          <IconButton
            aria-label="more"
            id="long-button"
            aria-controls={open ? 'long-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
            onClick={handleClick}
          >
            <MoreVert />
          </IconButton>
        </Box>
      </Bar>
      <Menu
        style={{ border: '1px solid red' }}
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {router.pathname !== '/settings' && (
          <>
            {session?.user?.roles?.[0] === 'admin' && (
              <>
                <MenuItem
                  id="admin"
                  onClick={() => {
                    router.push('/admin')
                  }}
                >
                  <ListItemIcon>
                    <AdminPanelSettings />
                  </ListItemIcon>
                  Admin Panel
                </MenuItem>
                <Divider />
              </>
            )}
            <MenuItem onClick={() => router.push('/settings')}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
          </>
        )}
        {router.pathname !== '/programs' && (
          <>
            <MenuItem onClick={() => router.push('/programs')}>
              <ListItemIcon>
                <House />
              </ListItemIcon>
              Programs
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem
          onClick={() => {
            signOut({ redirect: false })
            router.push('/api/auth/logout')
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </BarWrapper>
  )
}

export { NavBar }
