/* istanbul ignore file */
import { GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { AuthOptions } from '@/pages/api/auth/[...nextauth]'

export type LibraryServerSideProps = {
  program: fhir4.Library
}

// export const getVsacCredsServerSideProp = async (ctx: GetServerSidePropsContext) => {
//   const session = await getServerSession(ctx.req, ctx.res, AuthOptions)
//   const creds = await fetch(`${process.env.FHIR_CDR_URL}/api/credentials?userId=${session?.user?.id}`)
//   console.log('creds: ', creds)
//   // const vsacId = 'vsac'
//   const testId = 'vsac'
//   const hasVsacCreds = creds.find(c => c?.terminologyServerId === testId)
//     return { hasVsacCreds }
// }

// async function getServerSideProps(ctx: GetServerSidePropsContext) {
//   const props = await getVsacCredsServerSideProp(ctx)
//   const session = await getServerSession(ctx.req, ctx.res, AuthOptions)
//   console.log('session 456: ', session)
//   const creds = await fetch(`${process.env.FHIR_CDR_URL}/api/credentials?userId=${session?.user?.id}`)
//   console.log('creds: ', creds)
//   if (!props.hasVsacCreds) {
//     return {
//       redirect: {
//         permanent: false,
//         destination: "/settings",
//       },
//       props: props
//     };
//   } else {
//     return { props: props }
//   }
// }

// export default getServerSideProps
