import styled from 'styled-components'
import Head from 'next/head'

const ScaffoldWrapper = styled.div`
  height: 100%;
  display: flex;
  flex: 1;
  justify-content: space-between;
  padding: 24px 36px;
`

const StyledMain = styled.main`
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
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@600&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet"></link>
      </Head>
      <StyledMain>
        { children }
      </StyledMain>
      <footer>
      </footer>
    </ScaffoldWrapper>
  )
}

export { Scaffold }