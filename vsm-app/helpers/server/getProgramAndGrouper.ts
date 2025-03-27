import FhirClient from '@/backend/clients/FhirCdrClient'

const WHITELIST_VALUESET_FIELDS = [
  'extension',
  'url',
  'identifier',
  'version',
  'name',
  'title',
  'status',
  'publisher',
  'description',
  'useContext',
  'purpose',
  'compose'
]

const getProgramAndGrouper = async (programId: string) => {
  // get all grouper valueSets from within a program
  const programLibrary = (await FhirClient.getInstance().read({ resourceType: 'Library', id: programId as string })) as fhir4.Library

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
  const grouperLibrarySearchBundle = await FhirClient.getInstance().search({
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
        return FhirClient.getInstance().search({
          resourceType: 'ValueSet',
          searchParams: {
            url: url,
            version: version || '',
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
