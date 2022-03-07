import styled from 'styled-components'
import Head from 'next/head'

const ScaffoldWrapper = styled.div`
  min-height: 100vh;
  display: flex;
`

interface Props {
  children: React.ReactNode
}

const Scaffold = ({ children }: Props) => {
  return (
    <ScaffoldWrapper>
      <Head>
        <title>ValueSet Manager (VSM)</title>
        <meta name="description" content="A tool to edit ValueSet groupings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        { children }
      </main>
      <footer>
      </footer>
    </ScaffoldWrapper>
  )
}

export { Scaffold }