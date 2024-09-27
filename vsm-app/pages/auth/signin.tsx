import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next'
import { getProviders, signIn } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'
import { AuthOptions } from '../api/auth/[...nextauth]'
import { Box, Button, Typography } from '@mui/material'

export default function SignIn({ providers }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Box
      sx={{
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '4rem 6rem',
        background: 'rgba(255, 255, 255, 0.35)',
        borderRadius: '16px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <Typography sx={{ color: 'var(--theme-500)', textAlign: 'center', fontWeight: '400' }} variant="h2">
        Valueset Manager
      </Typography>
      {Object.values(providers).map((provider: any) => (
        <div key={provider?.name || 'provider-name'}>
          <Button variant='contained' size='large' id="signin" sx={{ mt: 8, width: '150px' }} onClick={() => signIn(provider.id)}>
            Sign in
          </Button>
        </div>
      ))}
    </Box>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, AuthOptions)
  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (session) {
    return { redirect: { destination: '/' } }
  }

  const providers = await getProviders()

  return {
    props: { providers: providers ?? [] }
  }
}
