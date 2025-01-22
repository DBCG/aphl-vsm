import styled from 'styled-components'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { BreadCrumbs } from './navigation/Breadcrumbs'
import { createContext, useState, useContext, ReactNode } from 'react'
import packageInfo from '@/package.json'
import Box from '@mui/material/Box'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { VSMSession } from '@/helpers/rolesHelper'
import { Divider, IconButton, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material'
import { Logout, MoreVert, Settings } from '@mui/icons-material'
import Notifications from '@/components/Notifications'

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
          <Notifications />
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
        <Box style={{ padding: '6px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <AccountCircleIcon style={{ marginRight: '18px', color: 'var(--theme-400)' }} fontSize="medium" />
          <Typography variant="body1" sx={{ color: 'var(--theme-400)' }}>
            {session?.user?.name}
          </Typography>
        </Box>
        <Box>
          <MenuItem onClick={() => router.push('/settings')}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
        </Box>
        <MenuItem id="logout" onClick={async () => await signOut()}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
        <Box style={{ padding: '1rem', paddingBottom: '.4rem', alignItems: 'center', width: '100%' }}>
          <Typography variant="body1" sx={{ color: 'gray', fontSize: '80%', textAlign: 'center' }}>
            App Version: {packageInfo.version}
          </Typography>
        </Box>
      </Menu>
    </BarWrapper>
  )
}

export { NavBar }
