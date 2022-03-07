import type { AppProps } from 'next/app'
import { Scaffold } from '../components/Scaffold'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Scaffold>
      <Component {...pageProps} />
    </Scaffold>
  )
}

export default MyApp
