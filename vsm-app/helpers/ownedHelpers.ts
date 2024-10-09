import { is } from './is'

const artifactIsOwned = (art: fhir4.RelatedArtifact) => {
  return Boolean(art?.type === 'composed-of' && (
    art?.extension?.find(ext => ext?.url?.endsWith('artifact-isOwned') && ext?.valueBoolean === true)
  ))
}

const getOwnedReferences = (resource: fhir4.Library | fhir4.PlanDefinition | fhir4.ValueSet): string[] => {
  // valuesets don't have relatedArtifact blocks
  if (is.valueSet(resource) || !resource?.relatedArtifact) return []
  const result = resource.relatedArtifact
    // only want owned artifacts
    .filter(i => artifactIsOwned(i))
    .map((ownedRa: fhir4.RelatedArtifact) => ownedRa.resource!)

    return result
}

type AllPossibleRes = (fhir4.Library | fhir4.ValueSet | fhir4.PlanDefinition)[]

const getOwnedCanonicals = (
  programLib: fhir4.Library,
  allPossibleResources: AllPossibleRes
) => {
  const allCanonicals = [] as string[]

  const ownedCanonicals = (resource: fhir4.Library | fhir4.PlanDefinition | fhir4.ValueSet) => {
    const refs = getOwnedReferences(resource)
    refs.forEach(canonical => {
      const [url] = canonical.split('|')
      allCanonicals.push(url)
      const matchFromBatch = allPossibleResources.find(res => res.url === url)
      if (matchFromBatch) {
        ownedCanonicals(matchFromBatch)
      }
    })
  }

  ownedCanonicals(programLib)
  return allCanonicals
}

export { getOwnedReferences, artifactIsOwned, getOwnedCanonicals }