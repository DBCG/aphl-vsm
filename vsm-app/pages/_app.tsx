import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Scaffold } from '@/components/Scaffold'
import '../styles/globals.css'
//import 'nextjs-breadcrumbs/dist/index.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <Scaffold>
        <Component {...pageProps} />
      </Scaffold>
    </SessionProvider>
  )
}

export default MyApp
