import { fhirCdrClient } from '@/fhirClients'
import { WHITELIST_VALUESET_FIELDS } from '@/pages/api/programs/[id]/details/valuesets'

const getProgramAndGrouper = async (programId: string) => {
  // get all grouper valueSets from within a program
  const programLibrary = (await fhirCdrClient.read({ resourceType: 'Library', id: programId as string })) as fhir4.Library

  const programStatus = programLibrary.status

  const grouperLibraryCanonical = programLibrary?.relatedArtifact?.find(
    (art) => art?.type === 'composed-of' && art?.resource?.includes('/Library/')
  )?.resource

  if (!grouperLibraryCanonical) {
    throw new Error('Could not get canonical reference')
  }
  const [grouperLibUrl, grouperLibVersion] = grouperLibraryCanonical.split('|')

  let searchParams = {
    url: grouperLibUrl,
    version: grouperLibVersion || '',
    status: programStatus
  }

  const grouperLibrarySearchBundle = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams
  })

  const library: fhir4.Library = grouperLibrarySearchBundle?.entry?.[0]?.resource

  const grouperValueSetCanonicals = library?.relatedArtifact
    ?.filter((art) => art.type === 'composed-of' && art?.resource?.includes('/ValueSet/'))
    ?.map((item) => item?.resource)
    ?.filter((ref) => !!ref) as string[]

  if (grouperValueSetCanonicals?.length) {
    const grouperValueSetSearchSets = await Promise.all(
      grouperValueSetCanonicals?.map((canonical: string) => {
        const [url, version] = canonical.split('|')
        return fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: url,
            version: version || '',
            status: programStatus,
            _elements: WHITELIST_VALUESET_FIELDS.join(',')
          }
        }) as Promise<fhir4.Bundle>
      })
    )

    const grouperVSets = grouperValueSetSearchSets?.map((bundle) => bundle?.entry?.[0]?.resource as fhir4.ValueSet)?.filter((r) => !!r)
    return { grouperVSets, programLibrary }
  } else {
    console.warn("Groupers not found from given program id: " + programId)
    return { grouperVSets: [], programLibrary }
  }
}

export default getProgramAndGrouper
