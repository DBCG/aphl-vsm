import styled from 'styled-components'
import Head from 'next/head'
import { FileContainer } from './FileContainer'
import { NavBar } from './NavBar'

const ScaffoldWrapper = styled.div`
  height: 100%;
  display: flex;
  flex: 1;
  justify-content: space-between;
`
  
  const StyledMain = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const Row = styled.div`
  display: flex;
  width: 100%;
`

const Content = styled.div`
  padding: 24px 36px;
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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StyledMain>
        <Row>
          <NavBar/>
        </Row>
        <Content>
          <FileContainer>
            { children }
          </FileContainer>
        </Content>
      </StyledMain>
      <footer>
      </footer>
    </ScaffoldWrapper>
  )
}

export { Scaffold }