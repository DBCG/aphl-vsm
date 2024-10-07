/* istanbul ignore file */
import { fhirCdrClient } from '@/fhirClients'
import { GetServerSidePropsContext } from 'next'
import logger from '@/helpers/server/logger'
export type LibraryServerSideProps = {
  program: fhir4.Library
}

export const getLibraryServerSideProp = async (ctx: GetServerSidePropsContext) => {
  const programId = ctx.query.id
  try {
    const program = (await fhirCdrClient.read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
    return program
  } catch (e) {
    logger.error(`Error fetching server side program with id: ${programId}`, e)
  }
}

async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const program = await getLibraryServerSideProp(ctx)
  if (!program) {
    return {
      redirect: {
        permanent: false,
        destination: '/'
      }
    }
  }

  return {
    props: {
      program
    }
  }
}

export default getServerSideProps
