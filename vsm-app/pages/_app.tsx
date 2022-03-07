import type { AppProps } from 'next/app'
import { Scaffold } from '../components/Scaffold'
import 'normalize.css/normalize.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Scaffold>
      <Component {...pageProps} />
    </Scaffold>
  )
}

export default MyApp
