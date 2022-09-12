import set from 'lodash.set'

const addValueSetToGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet || []
  if (!leafVSetsInGroup.length) {
    // need to make a new path
    const path = 'compose.include[0].valueSet'
    const valueToAdd = [vsCanonical]
    set(vs, path, valueToAdd)
  } else {
    if (!leafVSetsInGroup.includes(vsCanonical)) {
      leafVSetsInGroup.push(vsCanonical)
      if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
        vs.compose.include[0].valueSet = leafVSetsInGroup
      }
    }
  }
  return vs
}

// allowNoGroupers is true if the user is deleting a whole valueset from a program
// it is false if they are just editing groupers within a program, as program valuesets cannot be without groupers
const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonical: string, allowNoGroupers = false): fhir4.ValueSet => {
  let leafVsInGroup = vs.compose?.include?.[0]?.valueSet
  if (leafVsInGroup) {
    const updatedLeafVsInGroup = vs?.compose?.include?.[0]?.valueSet
      ?.filter(leafCanonical => leafCanonical !== vsCanonical)

    if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
      vs.compose.include[0].valueSet = updatedLeafVsInGroup
    }
  } else {
    console.error('no leaf valuesets exist in this group')
  }
  return vs
}

export { addValueSetToGrouper, removeValueSetFromGrouper }