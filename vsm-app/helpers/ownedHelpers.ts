const artifactIsOwned = (art: fhir4.RelatedArtifact) => {
  return Boolean(art?.type === 'composed-of' && (
    art?.extension?.find(ext => ext?.url?.endsWith('crmi-isOwned') && ext?.valueBoolean === true)
  ))
}

const getOwnedReferences = (resource: fhir4.Library | fhir4.PlanDefinition): string[] => {
  const result = resource.relatedArtifact!
    // only want owned artifacts
    .filter(i => artifactIsOwned(i))
    .map((ownedRa: fhir4.RelatedArtifact) => ownedRa.resource!)
    return result
}

export { getOwnedReferences, artifactIsOwned }