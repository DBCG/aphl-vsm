import styled from 'styled-components'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { BreadCrumbs } from './navigation/Breadcrumbs'
import { createContext, useState, useContext, ReactNode } from 'react'
import packageInfo from '@/package.json'
import Box from '@mui/material/Box'
import InfoIcon from '@mui/icons-material/Info'
import { VSMSession } from '@/helpers/rolesHelper'
import { Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material'
import { Logout, MoreVert, AdminPanelSettings, Settings } from '@mui/icons-material'



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
  const enableTerminologySource = process.env.NEXT_PUBLIC_ENABLE_TERMINOLOGY_ENDPOINT === 'true'

  return (
    <BarWrapper>
      <Bar>
        <BreadCrumbs isGrouperView={isGrouperView} />
        <Box sx={{ alignItems: 'center', display: 'flex' }}>
          <Tooltip title={`App Version v-${packageInfo.version}`}>
            <InfoIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px' }} />
          </Tooltip>
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
        {enableTerminologySource && session?.user?.roles?.[0] === 'admin' && (
          <Box>
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
          </Box>
        )}
        {enableTerminologySource && (
          <Box>
            <MenuItem onClick={() => router.push('/settings')}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
          </Box>
        )}
        <MenuItem
          id="logout"
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
