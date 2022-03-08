import styled from 'styled-components'
import Head from 'next/head'
import { NavBar } from './NavBar'

const ScaffoldWrapper = styled.div`
  height: 100%;
  display: flex;
  flex: 1;
  justify-content: space-between;
  padding: 24px 36px;
  font-family: sans-serif;
`

const StyledMain = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
`

const Row = styled.div`
  display: flex;
  width: 100%;
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
      <StyledMain>
        <Row>
          <NavBar></NavBar>
        </Row>
        { children }
      </StyledMain>
      <footer>
      </footer>
    </ScaffoldWrapper>
  )
}

export { Scaffold }