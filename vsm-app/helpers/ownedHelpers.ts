const artifactIsOwned = (art: fhir4.RelatedArtifact) => {
  return Boolean(art?.type === 'composed-of' && (
    art?.extension?.find(ext => ext?.url?.endsWith('crmi-isOwned') && ext?.valueBoolean === true)
  ))
}

const getOwnedReferences = (resource: fhir4.Library | fhir4.PlanDefinition): string[] => {
  if (!resource.relatedArtifact) return []
  const result = resource.relatedArtifact
    // only want owned artifacts
    .filter(i => artifactIsOwned(i))
    .map((ownedRa: fhir4.RelatedArtifact) => ownedRa.resource!)

    return result
}

const getOwnedCanonicals = (programLib, allPossibleResources) => {
  const allCanonicals = []

  const ownedCanonicals = (resource: fhir4.Library | fhir4.PlanDefinition) => {
    const refs = getOwnedReferences(resource)
    refs.forEach(canonical => {
      const [url] = canonical.split('|')
      allCanonicals.push(url)
      const matchFromBatch = allPossibleResources.find(res => res.url === url)
      ownedCanonicals(matchFromBatch)
    })
  }

  ownedCanonicals(programLib)
  return allCanonicals
}

export { getOwnedReferences, artifactIsOwned, getOwnedCanonicals }