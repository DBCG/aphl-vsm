import styled from 'styled-components'
import Head from 'next/head'
import { FileContainer } from '@/components/FileContainer'
import { NavBar } from '@/components/NavBar'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useGetEndpoints } from '@/hooks/useGetEndpoints'
import { ARTIFACT_ROUTE_URL } from '@/constants'

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
  const router = useRouter()
  const { data: session } = useSession()
  const { allEndpoints, endpointsLoading } = useGetEndpoints()

  useEffect(() => {
    if (!session || endpointsLoading || router.pathname.startsWith('/settings')) return
    const endpoints: fhir4.Endpoint[] = allEndpoints?.endpoints ?? []
    const noEndpoints = endpoints.length === 0
    const missingArtifactRoute = endpoints.length > 0 && endpoints.every(
      (ep) => !!ep.extension?.find((ext) => ext.url === ARTIFACT_ROUTE_URL)?.valueUri
    )
    if (noEndpoints || missingArtifactRoute) {
      router.push('/settings')
    }
  }, [session, endpointsLoading, allEndpoints, router])

  return (
    <ScaffoldWrapper>
      <Head>
        <title>ValueSet Manager (VSM)</title>
        <meta name="description" content="A tool to edit ValueSet groupings" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StyledMain>
        <Row>{!router.pathname.includes('signin') && <NavBar />}</Row>
        <Content>{router.pathname.includes('signin') ? children : <FileContainer>{children}</FileContainer>}</Content>
      </StyledMain>
      <footer></footer>
    </ScaffoldWrapper>
  )
}

export { Scaffold }
