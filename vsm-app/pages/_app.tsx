import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Scaffold } from '@/components/Scaffold'
import { ToastContainer, Slide } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import '../styles/globals.css'

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
        <Component {...pageProps} />
      </Scaffold>
    </SessionProvider>
  )
}

export default MyApp
