/* istanbul ignore file */
import FhirClient from '@/backend/clients/FhirClient'
import { GetServerSidePropsContext } from 'next'
export type LibraryServerSideProps = {
  program: fhir4.Library
}

export const getLibraryServerSideProp = async (ctx: GetServerSidePropsContext) => {
  const programId = ctx.query.id
  try {
    const program = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
    return program
  } catch (e) {
    // TODO: Logger doesn't seem to work here
    console.error(`Error fetching server side program with id: ${programId}`, e)
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
