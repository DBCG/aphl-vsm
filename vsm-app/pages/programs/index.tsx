import { useEffect, useState } from 'react'
import type { GetServerSidePropsContext, NextPage } from 'next'
import ProgramsTab from '@/components/Provisional/ProgramsTab'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Box, Tab } from '@mui/material'
import { ProvisionalResourcesTab } from '@/components/Provisional/ProvisionalResourcesTab'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { AuthOptions } from '../api/auth/[...nextauth]'
import { tsCredentialService } from '@/backend/services/TsCredentialService'

const Programs: NextPage = () => {
  const [value, setValue] = useState('1')
  const router = useRouter()
  useEffect(() => {
    if (router?.query?.resourceType === 'provisional') {
      setValue('2')
    }
  }, [router.query])

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  return (
    <TabContext value={value}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <TabList onChange={handleChange} aria-label="dashboard tabs">
          <Tab onClick={() => router.push('/programs')} label="Programs" value="1" />
          <Tab onClick={() => router.push('/programs?resourceType=provisional')} label="Provisional Resources" value="2" />
        </TabList>
      </Box>
      <TabPanel value="1">
        <ProgramsTab />
      </TabPanel>
      <TabPanel value="2">
        <ProvisionalResourcesTab />
      </TabPanel>
    </TabContext>
  )
}

const getVsacCredsServerSideProp = async (ctx: GetServerSidePropsContext) => {
  const session = await getServerSession(ctx.req, ctx.res, AuthOptions)
  const creds = await tsCredentialService.getAllCredentials(session?.user?.id as string)
  console.log('creds: ', creds)
  // const vsacId = 'vsac'
  const testId = 'vsac'
  const hasVsacCreds = creds.find(c => c?.terminologyServerId === testId)
    return { hasVsacCreds }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {

  const props = await getVsacCredsServerSideProp(context)
  if (!props.hasVsacCreds) {
    return {
      redirect: {
        permanent: false,
        destination: "/settings",
      },
      props: props
    };
  } else {
    return { props: props }
  }
}

export default Programs
