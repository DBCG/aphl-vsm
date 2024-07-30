import { fhirCdrClient } from '@/fhirClients'
import { GetServerSidePropsContext } from 'next'

export type LibraryServerSideProps = {
  program: fhir4.Library
}

export const getLibraryServerSideProp = async (ctx: GetServerSidePropsContext) => {
    const programId = ctx.query.id
    const program = (await fhirCdrClient.read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
    return program
}


async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const program = await getLibraryServerSideProp(ctx)
  return {
    props: {
      program
    }
  }
}

export default getServerSideProps;


