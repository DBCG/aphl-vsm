import set from 'lodash.set'

const addValueSetToGrouper = (vs: fhir4.ValueSet, valueSetCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet || []
  if (!leafVSetsInGroup.length) {
    // need to make a new path
    const path = 'compose.include[0].valueSet'
    const valueToAdd = [valueSetCanonical]
    set(vs, path, valueToAdd)
  } else {
    if (!leafVSetsInGroup.includes(valueSetCanonical)) {
      leafVSetsInGroup.push(valueSetCanonical)
      if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
        vs.compose.include[0].valueSet = leafVSetsInGroup
      }
    }
  }
  return vs
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, valueSetCanonical: string): fhir4.ValueSet => {
  let leafVsInGroup = vs.compose?.include?.[0]?.valueSet
  if (leafVsInGroup) {
    const updatedLeafVsInGroup = vs?.compose?.include?.[0]?.valueSet
      ?.filter(leafCanonical => leafCanonical !== valueSetCanonical)
    if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
      vs.compose.include[0].valueSet = updatedLeafVsInGroup
    }
  } else {
    console.error('no leaf valuesets exist in this group')
  }
  return vs
}

export { addValueSetToGrouper, removeValueSetFromGrouper }