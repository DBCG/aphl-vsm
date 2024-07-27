import { fhirCdrClient } from '@/fhirClients'
import { GetServerSidePropsContext } from 'next'

export type LibraryServerSideProps = {
  program: fhir4.Library
}

export const getLibraryServerSide = (getServerSideFn: Function) => {
  return async (context: GetServerSidePropsContext) => {
    const programId = context.query.id
    const program = (await fhirCdrClient.read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
    return getServerSideFn({ program })
  }
}


