import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Scaffold } from '@/components/Scaffold'
import { ToastContainer, Slide } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import '../styles/globals.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { ToastContainer, Slide } from 'react-toastify'
import type {} from '@mui/lab/themeAugmentation'
import 'react-toastify/dist/ReactToastify.css'

const theme = createTheme({
  components: {
    // Name of the component
    MuiButton: {
      styleOverrides: {
        // Name of the slot
        root: {
          background: 'rgba(1, 161, 175, 1)',
          color: 'white',
          '&:hover': {
            background: '#FAA024'
          }
        }
      }
    }
  },
  palette: {
    primary: {
      main: 'rgba(1, 161, 175, 1)'
    }
  }
})

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider
      session={session}
      // Re-fetch session every 5 minutes
      refetchInterval={5 * 60}
      // Re-fetches session when window is focused
      refetchOnWindowFocus={true}
    >
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        draggable={false}
        pauseOnHover
        transition={Slide}
      />
      <Scaffold>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
        </ThemeProvider>
      </Scaffold>
    </SessionProvider>
  )
}

export default MyApp
