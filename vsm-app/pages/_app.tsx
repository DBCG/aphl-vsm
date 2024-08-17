import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Scaffold } from '@/components/Scaffold'

import '../styles/globals.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { ToastContainer, Slide } from 'react-toastify'
import type {} from '@mui/lab/themeAugmentation'
import 'react-toastify/dist/ReactToastify.css'
import { NavContextProvider } from '@/components/NavBar'
import createEmotionCache from '../utils/createEmotionCache'
import { CacheProvider } from '@emotion/react'
// below: https://mui.com/material-ui/react-typography/
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { SWRConfig } from 'swr'

const theme = createTheme({
  components: {
    // Name of the component
    MuiButton: {
      styleOverrides: {
        // Name of the slot
        root: {
          variants: [
            {
              props: { variant: "text" },
              style: {
                borderRadius: 0,
                borderBottom: "2px solid transparent",
                "&:hover": {
                  borderBottom: "2px solid white",
                  borderBottomColor: "inherit"
                },
              }
            },
            {
              props: { variant: "outlined" },
              style: {
                border: "none",
                backgroundColor: "var(--accent)",
                "&:hover": {
                  backgroundColor: "var(--theme-400)",
                },
              }
            },
            {
              props: { variant: "contained" },
              style: {
                background: 'var(--theme-300)',
                color: 'var(--white)',
                '&:hover': {
                  background: 'var(--hover-background)'
                },
              }
            }
          ],
        }
      }
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          h1: 'h2',
          h2: 'h3',
          h3: 'h4',
          h4: 'h4',
          h5: 'h4',
          h6: 'h4',
          subtitle1: 'h4',
          subtitle2: 'h4',
          body1: 'span',
          body2: 'span'
        }
      }
    }
  },
  palette: {
    primary: {
      // for some reason, can't use a css var here but can above
      main: 'rgba(1, 161, 175, 1)'
    }
  }
})

const clientSideEmotionCache = createEmotionCache()

// @ts-ignore-next-line
function MyApp({ Component, pageProps: { session, ...pageProps }, emotionCache = clientSideEmotionCache }: AppProps) {
  return (
    <SessionProvider
      session={session}
      // Re-fetch session every 5 minutes
      refetchInterval={5 * 60}
      // Re-fetches session when window is focused
      refetchOnWindowFocus={true}
    >
      <CacheProvider value={emotionCache}>
      <NavContextProvider>
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
            <SWRConfig value={{ revalidateOnFocus: false }}>
              <Component {...pageProps} />
            </SWRConfig>
          </ThemeProvider>
        </Scaffold>
      </NavContextProvider>
      </CacheProvider>
    </SessionProvider>
  )
}

export default MyApp
