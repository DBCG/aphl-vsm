/* istanbul ignore file */
import FhirClient from '@/backend/clients/FhirClient'
import { GetServerSidePropsContext } from 'next'
export type LibraryServerSideProps = {
  program: fhir4.Library
}

// In some routes we don't need all of the program
const matchedRoutes = {
  '^/programs/([^/]+)/valuesets/search$': ['status']
}

/**
 * Matches a URL path against defined route patterns
 * @param {string} path - The URL path to match
 * @returns {Object|null} - Match result with value and captured params
 */
export function matchRoute(path: string) {
  // Remove query parameters if present
  const cleanPath = path.split('?')[0]

  for (const [pattern, value] of Object.entries(matchedRoutes)) {
    const regexPattern = new RegExp(`^${pattern}$`)
    const match = cleanPath.match(regexPattern)

    if (match) {
      // Extract captured groups (parameters)
      const params = match.slice(1)
      return value
    }
  }

  return null // No match found
}

export const getLibraryServerSideProp = async (ctx: GetServerSidePropsContext) => {
  const whitelist = matchRoute(ctx.resolvedUrl)
  const programId = ctx.query.id
  let url = `Library/${programId}`
  if (whitelist != null) {
    url = url + `?_elements=${whitelist.join(',')}`
  }
  try {
    const program = await FhirClient.getInstance().request(url)
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
