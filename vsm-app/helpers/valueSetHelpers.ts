const addValueSetToGrouper = (vs: fhir4.ValueSet, valueSetCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet || []
  if (!leafVSetsInGroup.length) {
    // need to make a new array
  } else {
    if (!leafVSetsInGroup.includes(valueSetCanonical)) {
      leafVSetsInGroup.push(valueSetCanonical)
      vs.compose.include.[0].valueSet = leafVSetsInGroup
    }
  }
  return vs
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, valueSetCanonical: string): fhir4.ValueSet => {
  const leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet
    ?.filter(leafCanonical => leafCanonical !== valueSetCanonical)
  vs.compose.include.[0].valueSet = leafVSetsInGroup
  return vs
}

export { addValueSetToGrouper, removeValueSetFromGrouper }